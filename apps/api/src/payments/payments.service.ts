import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { AppointmentStatus, DepositStatus, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { STUDIO_TIMEZONE } from '../common/timezone';
import { EmailService, AppointmentForEmail } from '../notifications/email.service';

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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly mpConfig: MercadoPagoConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly emailService: EmailService,
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
    const payment = await paymentClient.get({ id: paymentId });

    this.logger.log(
      `Webhook MP: payment=${paymentId} status=${payment.status} external_reference=${payment.external_reference}`,
    );

    if (payment.status !== 'approved') {
      // rejected, in_process, refunded, etc. — nada que confirmar todavía.
      return;
    }

    const appointmentId = payment.external_reference;
    if (!appointmentId) {
      this.logger.error(`Pago ${paymentId} approved sin external_reference — no se puede vincular a un turno.`);
      return;
    }

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
        await this.emailService.sendAppointmentConfirmation(confirmedAppointment);
      } catch (error) {
        this.logger.error(
          `Error inesperado enviando el email de confirmación del turno ${confirmedAppointment.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
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
