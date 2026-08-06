import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { AppointmentStatus, DepositStatus, GiftCardStatus, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { GiftCardsService } from '../gift-cards/gift-cards.service';
import { STUDIO_TIMEZONE } from '../common/timezone';
import { EmailService, AppointmentForEmail } from '../notifications/email.service';

/**
 * Marca en el external_reference que lo pagado es una gift card y no un turno
 * — es el único dato nuestro que vuelve en el webhook. Ver
 * handlePaymentNotification().
 */
const GIFT_CARD_REFERENCE_PREFIX = 'gift-card:';

/**
 * Si el error de la API de Mercado Pago es definitivo (el pago no existe y no
 * va a existir) o transitorio (red, 5xx). Los definitivos se descartan
 * devolviendo 200 para que MP deje de reintentar; los transitorios se
 * re-lanzan para que reintente.
 *
 * Hay que mirar dos formas distintas porque el SDK no normaliza: un id
 * numérico inexistente vuelve como { status: 404, error: 'not_found' }, y uno
 * con formato inválido como { error: 'resource not found' } SIN status. La
 * segunda se nos escapó en la primera versión de este chequeo y seguía
 * devolviendo 500.
 */
function isPermanentMpLookupError(error: unknown): boolean {
  const { status, error: errorCode } = (error ?? {}) as { status?: number; error?: string };

  if (typeof status === 'number') {
    return status >= 400 && status < 500;
  }

  return typeof errorCode === 'string' && errorCode.toLowerCase().includes('not found');
}

function formatArs(amount: Prisma.Decimal): string {
  return Number(amount).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

// Igual que el CORS condicional de main.ts: en local, `apps/web` corre en
// localhost:3000, así que las back_urls tienen que apuntar ahí para poder
// probar el flujo de pago de punta a punta en desarrollo. En producción
// (NODE_ENV=production, fijado en el Dockerfile) apuntan al dominio real —
// hardcodear siempre el dominio real rompería el testing local, porque
// Mercado Pago redirigiría al sitio en vivo en vez de al servidor de dev.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const FRONTEND_BASE_URL = IS_PRODUCTION
  ? 'https://freakymonster.dipaoloproyects.space'
  : 'http://localhost:3000';

/**
 * A dónde avisa Mercado Pago que un pago cambió de estado. Es la MISMA base
 * que las back_urls porque en producción Nginx sirve el front y la API bajo un
 * solo dominio (/api/* va al backend).
 *
 * Va con la preferencia y no solo configurado en el panel de Mercado Pago:
 * así el webhook viaja con cada pago, en vez de depender de una config global
 * que no está versionada y que nadie recuerda haber tocado. Sin esto, ningún
 * pago se confirma solo — el turno queda PENDING hasta que alguien lo note y
 * dispare el webhook a mano.
 *
 * Solo en producción, por el mismo motivo que auto_return: Mercado Pago exige
 * una URL pública y rechaza localhost, y aunque la aceptara no podría
 * alcanzarla desde afuera. En dev el webhook se prueba haciéndole POST a mano.
 */
const PAYMENT_WEBHOOK_OPTIONS = IS_PRODUCTION
  ? { notification_url: `${FRONTEND_BASE_URL}/api/payments/webhook` }
  : {};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly mpConfig: MercadoPagoConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly emailService: EmailService,
    private readonly giftCardsService: GiftCardsService,
  ) {
    this.mpConfig = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
  }

  async createPaymentPreference(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true },
    });
    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }
    if (!appointment.service.requiresDeposit) {
      throw new BadRequestException('Este servicio no requiere seña, no hay nada que cobrar');
    }

    const preference = new Preference(this.mpConfig);
    const result = await preference.create({
      body: {
        items: [
          {
            id: appointment.serviceId,
            title: `Seña — ${appointment.service.name}`,
            quantity: 1,
            unit_price: Number(appointment.service.depositAmount),
            currency_id: 'ARS',
          },
        ],
        // Clave para poder identificar el turno en el webhook.
        external_reference: appointment.id,
        back_urls: {
          success: `${FRONTEND_BASE_URL}/turno/confirmado`,
          pending: `${FRONTEND_BASE_URL}/turno/pendiente`,
          failure: `${FRONTEND_BASE_URL}/turno/error`,
        },
        // Sin esto, MP se queda en su propia pantalla de "congrats" después
        // del pago y espera a que el cliente haga click en "volver" a mano
        // — con auto_return, redirige solo a back_urls.success ni bien el
        // pago queda approved. PERO la API de MP rechaza auto_return si
        // back_urls no son URLs públicas (400 "auto_return invalid" con
        // localhost, confirmado a mano) — así que solo lo mandamos en
        // producción. En dev, hay que clickear "volver al sitio" a mano
        // en la pantalla de MP; no hay forma de evitarlo con localhost.
        ...(IS_PRODUCTION ? { auto_return: 'approved' as const } : {}),
        ...PAYMENT_WEBHOOK_OPTIONS,
      },
    });

    return { initPoint: result.init_point, preferenceId: result.id };
  }

  /**
   * Misma mecánica que createPaymentPreference(), con tres diferencias:
   * el importe es el total de la gift card (no una seña), el
   * external_reference lleva el prefijo que el webhook usa para distinguirla
   * de un turno, y las back_urls apuntan a las páginas de gift card, porque
   * "tu seña fue recibida" no es lo que corresponde leer acá.
   */
  async createGiftCardPaymentPreference(giftCardId: string) {
    const giftCard = await this.prisma.giftCard.findUnique({ where: { id: giftCardId } });
    if (!giftCard) {
      throw new NotFoundException('Gift card no encontrada');
    }
    if (giftCard.status !== GiftCardStatus.PENDING) {
      // Ya se pagó: cobrarla de nuevo generaría un segundo código para la
      // misma card, o un cobro sin nada que emitir.
      throw new BadRequestException('Esta gift card ya fue emitida');
    }

    const preference = new Preference(this.mpConfig);
    const result = await preference.create({
      body: {
        items: [
          {
            id: giftCard.id,
            title: `Gift card Freaky Monster Tattoo Studio — ${formatArs(giftCard.amount)}`,
            quantity: 1,
            unit_price: Number(giftCard.amount),
            currency_id: 'ARS',
          },
        ],
        external_reference: `${GIFT_CARD_REFERENCE_PREFIX}${giftCard.id}`,
        back_urls: {
          success: `${FRONTEND_BASE_URL}/gift-card/confirmado`,
          pending: `${FRONTEND_BASE_URL}/gift-card/pendiente`,
          failure: `${FRONTEND_BASE_URL}/gift-card/error`,
        },
        // Ver el comentario de createPaymentPreference(): MP rechaza
        // auto_return si las back_urls no son públicas, así que en dev no va.
        ...(IS_PRODUCTION ? { auto_return: 'approved' as const } : {}),
        // La gift card tiene el mismo problema que el turno: sin esto, el
        // código no se emite hasta que alguien dispare el webhook a mano.
        ...PAYMENT_WEBHOOK_OPTIONS,
      },
    });

    return { initPoint: result.init_point, preferenceId: result.id };
  }

  /**
   * Se llama desde POST /payments/webhook. `paymentId` viene de la
   * notificación liviana de Mercado Pago — nunca confiamos en el resto del
   * payload del webhook, siempre volvemos a consultar el pago real contra
   * la API de MP con este id antes de tocar nada.
   */
  async handlePaymentNotification(paymentId: string): Promise<void> {
    const paymentClient = new Payment(this.mpConfig);

    // Consultar el pago es lo primero que puede fallar, y no todos los fallos
    // se tratan igual:
    //
    //  - 4xx (el pago no existe, o no es de esta cuenta): reintentar no lo va
    //    a hacer aparecer. Se loguea y se corta devolviendo 200, para que MP
    //    deje de reintentar algo que nunca va a cambiar. Es el caso del botón
    //    "Simular notificación" del panel, que manda un id inventado.
    //  - Cualquier otra cosa (red caída, 5xx de MP): sí es transitorio, así
    //    que se re-lanza. El 500 resultante es deseado: hace que MP reintente
    //    más tarde, que es exactamente lo que queremos para no perder un pago
    //    real por un problema momentáneo.
    //
    // Sin este try/catch, un id inexistente tiraba una excepción sin manejar y
    // Nest respondía 500 — el SDK de Mercado Pago no lanza Error ni
    // HttpException sino un objeto plano con `status`, así que no hay forma de
    // que Nest lo traduzca solo.
    let payment: Awaited<ReturnType<typeof paymentClient.get>>;
    try {
      payment = await paymentClient.get({ id: paymentId });
    } catch (error) {
      if (isPermanentMpLookupError(error)) {
        this.logger.warn(
          `Webhook MP: el pago ${paymentId} no existe o no es accesible. Se descarta sin reintentar.`,
        );
        return;
      }
      this.logger.error(
        `Webhook MP: no se pudo consultar el pago ${paymentId} (${
          error instanceof Error ? error.message : JSON.stringify(error)
        }). Se devuelve error para que MP reintente.`,
      );
      throw error;
    }

    this.logger.log(
      `Webhook MP: payment=${paymentId} status=${payment.status} external_reference=${payment.external_reference}`,
    );

    if (payment.status !== 'approved') {
      // rejected, in_process, refunded, etc. — nada que confirmar todavía.
      return;
    }

    const externalReference = payment.external_reference;
    if (!externalReference) {
      this.logger.error(`Pago ${paymentId} approved sin external_reference — no se puede vincular a nada.`);
      return;
    }

    // Dos cosas distintas se pagan por el mismo webhook. Las preferencias de
    // gift card marcan su external_reference con un prefijo; las de turno
    // mandan el id pelado. El prefijo va del lado nuevo a propósito: cambiar
    // el formato de los turnos rompería cualquier pago de turno que ya esté
    // en vuelo cuando se despliegue esto.
    if (externalReference.startsWith(GIFT_CARD_REFERENCE_PREFIX)) {
      await this.issueGiftCardFromPayment(
        externalReference.slice(GIFT_CARD_REFERENCE_PREFIX.length),
        String(paymentId),
      );
      return;
    }

    const appointmentId = externalReference;

    let confirmedAppointment: AppointmentForEmail | null;
    try {
      confirmedAppointment = await this.prisma.$transaction(
        (tx) => this.confirmAppointmentFromPayment(tx, appointmentId, paymentId),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        // Choque de serialización con el cron de limpieza o con otro webhook
        // en simultáneo (reintento de MP). Es seguro reintentar: MP nos va a
        // volver a pegar si no devolvemos 200, y este método es idempotente.
        this.logger.warn(`Conflicto de transacción confirmando el turno ${appointmentId}, MP reintentará.`);
        throw error;
      }
      throw error;
    }

    // El email se dispara DESPUÉS de que la transacción ya confirmó (nunca
    // adentro: una llamada de red lenta no debe mantener abierto un lock de
    // una transacción Serializable). Si falla, no vuelve a tocar el turno —
    // EmailService ya garantiza no tirar excepciones hacia afuera, pero lo
    // envolvemos igual acá por las dudas.
    if (confirmedAppointment) {
      try {
        // Los dos avisos: la reserva entró sola por la web, así que el estudio
        // también tiene que enterarse. (El alta manual del panel manda solo el
        // del cliente — ver AdminService.createAppointment().)
        await this.emailService.sendCustomerConfirmation(confirmedAppointment);
        await this.emailService.sendStudioNotification(confirmedAppointment);
      } catch (error) {
        this.logger.error(
          `Error inesperado enviando el email de confirmación del turno ${confirmedAppointment.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  /**
   * Emite la gift card y manda el email con el código.
   *
   * No necesita la transacción Serializable que sí usa el turno: ahí el
   * aislamiento existe porque dos pagos podrían pelearse por el mismo horario.
   * Acá no hay recurso compartido — cada card es suya — y la idempotencia ante
   * los reintentos de MP la da el chequeo de estado dentro de
   * GiftCardsService.issueAfterPayment().
   */
  private async issueGiftCardFromPayment(giftCardId: string, paymentId: string): Promise<void> {
    const issued = await this.giftCardsService.issueAfterPayment(giftCardId, paymentId);

    if (!issued) {
      // O no existe (external_reference basura) o ya estaba emitida (reintento
      // del webhook). Lo segundo es normal y esperado; lo primero requiere
      // mirar, por eso se loguea con el id.
      this.logger.warn(`Pago ${paymentId}: la gift card ${giftCardId} no existe o ya estaba emitida.`);
      return;
    }

    this.logger.log(`Gift card ${issued.id} emitida con código ${issued.code} (pago ${paymentId}).`);

    // Igual que con los turnos: el email va después de tocar la base y
    // envuelto, para que una caída de Resend no vuelva a intentar emitir la
    // card ni haga fallar el webhook (MP reintentaría y ya está emitida).
    try {
      await this.emailService.sendGiftCardIssued(issued);
    } catch (error) {
      this.logger.error(
        `Error inesperado enviando el email de la gift card ${issued.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async confirmAppointmentFromPayment(
    tx: Prisma.TransactionClient,
    appointmentId: string,
    paymentId: string | number,
  ): Promise<AppointmentForEmail | null> {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) {
      this.logger.error(
        `Pago ${paymentId} approved para un turno inexistente (external_reference=${appointmentId}). Requiere revisión manual.`,
      );
      return null;
    }

    if (appointment.depositStatus === DepositStatus.PAID) {
      // Notificación duplicada/reintento de MP para un pago ya procesado.
      // No hay nada nuevo que confirmar, y ya se mandó el email la primera vez.
      return null;
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      // Caso de carrera: el turno expiró (15 min) antes de que llegara el
      // webhook. Volvemos a chequear si el horario sigue libre.
      const dateStr = DateTime.fromJSDate(appointment.startTime, { zone: 'utc' })
        .setZone(STUDIO_TIMEZONE)
        .toFormat('yyyy-LL-dd');
      const busyAppointments = await this.availabilityService.findBusyAppointments(tx, appointment.artistId, dateStr);
      const slotStillFree = !this.availabilityService.hasOverlap(
        appointment.startTime,
        appointment.endTime,
        busyAppointments,
      );

      if (slotStillFree) {
        // Nadie más tomó el horario todavía: el cliente pagó, se lo
        // recuperamos aunque haya expirado por los 15 minutos.
        const updated = await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: AppointmentStatus.CONFIRMED, depositStatus: DepositStatus.PAID, expiresAt: null },
          include: { artist: true, service: true },
        });
        this.logger.warn(
          `Turno ${appointment.id} había expirado pero el slot seguía libre: recuperado y CONFIRMED tras el pago ${paymentId}.`,
        );
        return updated;
      }

      // El horario ya lo tomó otra persona: NO le pisamos la reserva.
      // Dejamos el turno CANCELLED pero con constancia del pago recibido,
      // para que el estudio gestione el reembolso a mano — nunca en
      // silencio. No se manda email de confirmación: el turno NO quedó
      // confirmado.
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          depositStatus: DepositStatus.PAID,
          notes: [
            appointment.notes,
            `⚠️ Pago de Mercado Pago (payment id: ${paymentId}) recibido después de que el turno expiró y el horario ya fue tomado por otra reserva. Requiere reembolso manual.`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      });
      this.logger.error(
        `Turno ${appointment.id} expiró y el slot ya fue tomado por otra reserva. Pago ${paymentId} APROBADO pero el turno sigue CANCELLED — requiere reembolso manual.`,
      );
      return null;
    }

    // Camino feliz: el turno seguía PENDING esperando el pago.
    return tx.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.CONFIRMED, depositStatus: DepositStatus.PAID, expiresAt: null },
      include: { artist: true, service: true },
    });
  }
}
