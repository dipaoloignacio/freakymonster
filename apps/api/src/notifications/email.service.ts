import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { formatLocalDate, formatLocalDateTime } from '../common/timezone';
import {
  amountBlock,
  button,
  codeBlock,
  dataTable,
  EMAIL_CONTACT,
  emailShell,
  esc,
  heading,
  paragraph,
  quote,
} from './email-layout';

export interface GiftCardForEmail {
  id: string;
  /// Ya emitida: el código y el vencimiento existen recién cuando se pagó.
  code: string | null;
  amount: Prisma.Decimal | number | string;
  expiresAt: Date | null;
  purchaserName: string;
  purchaserEmail: string;
  recipientName: string | null;
  recipientEmail: string | null;
  message: string | null;
}

export interface AppointmentForEmail {
  id: string;
  customerName: string;
  customerEmail: string | null;
  startTime: Date;
  artist: { name: string };
  service: { name: string };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly studioEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.NOTIFICATION_FROM_EMAIL!;
    this.studioEmail = process.env.STUDIO_NOTIFICATION_EMAIL!;
  }

  /**
   * Los dos destinatarios de un turno recién CONFIRMED están separados porque
   * no todos los caminos necesitan los dos: el alta manual del panel solo le
   * escribe al cliente, porque el aviso al estudio sería avisarle de un turno
   * que acaba de cargar a mano. El webhook de Mercado Pago sí manda los dos
   * (ver PaymentsService): ahí la reserva entró sola y el estudio se tiene
   * que enterar.
   *
   * Ninguno de los dos tira excepciones hacia afuera: un email caído no puede
   * voltear la confirmación del turno ni la respuesta al webhook que la
   * disparó. Cualquier falla queda logueada, no silenciada del todo.
   */
  async sendCustomerConfirmation(appointment: AppointmentForEmail): Promise<void> {
    // customerEmail es opcional en el DTO: sin email no hay nada que mandar,
    // y el chequeo vive acá para que ningún llamador tenga que acordarse.
    if (!appointment.customerEmail) return;

    await this.trySend({
      to: appointment.customerEmail,
      subject: 'Tu turno en Freaky Monster Tattoo Studio está confirmado',
      html: this.buildCustomerEmailHtml(appointment, formatLocalDateTime(appointment.startTime)),
    });
  }

  async sendStudioNotification(appointment: AppointmentForEmail): Promise<void> {
    await this.trySend({
      to: this.studioEmail,
      subject: `Nueva reserva confirmada — ${appointment.customerName}`,
      html: this.buildStudioEmailHtml(appointment, formatLocalDateTime(appointment.startTime)),
    });
  }

  /**
   * El email que entrega la gift card, con el código.
   *
   * Va a `recipientEmail` si la compraron para regalar, y al comprador si no.
   * El texto también cambia según eso: recibir "compraste una gift card"
   * cuando en realidad te la regalaron es desconcertante, y el mensaje del
   * comprador (la dedicatoria) solo tiene sentido leerlo del lado de quien lo
   * recibe.
   *
   * No tira excepciones hacia afuera, igual que los otros dos: el pago ya está
   * cobrado y la card ya está emitida — un email caído no puede deshacer eso.
   */
  async sendGiftCardIssued(giftCard: GiftCardForEmail): Promise<void> {
    const isGift = Boolean(giftCard.recipientEmail || giftCard.recipientName);
    const to = giftCard.recipientEmail ?? giftCard.purchaserEmail;

    await this.trySend({
      to,
      subject: isGift
        ? `${giftCard.purchaserName} te regaló una gift card de Freaky Monster`
        : 'Tu gift card de Freaky Monster Tattoo Studio',
      html: this.buildGiftCardEmailHtml(giftCard, isGift),
    });
  }

  private async trySend(params: { to: string; subject: string; html: string }): Promise<void> {
    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (result.error) {
        this.logger.error(`Resend devolvió error enviando a ${params.to}: ${JSON.stringify(result.error)}`);
        return;
      }

      this.logger.log(`Email enviado a ${params.to} (Resend id: ${result.data?.id})`);
    } catch (error) {
      this.logger.error(
        `Falló el envío de email a ${params.to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Los datos del turno en sí, idénticos para el cliente y para el estudio.
   * Cada destinatario agrega arriba/abajo las filas que solo le sirven a él.
   */
  private buildAppointmentRows(
    appointment: AppointmentForEmail,
    whenLocal: string,
  ): { label: string; value: string }[] {
    return [
      { label: 'Tatuador/a', value: appointment.artist.name },
      { label: 'Servicio', value: appointment.service.name },
      { label: 'Fecha y hora', value: `${whenLocal} (hora Mendoza)` },
    ];
  }

  private buildCustomerEmailHtml(appointment: AppointmentForEmail, whenLocal: string): string {
    return emailShell({
      title: 'Turno confirmado',
      // Lo que se lee en la bandeja al lado del asunto. Se pone la fecha
      // porque es el dato que uno busca cuando ve el mail en la lista.
      preheader: `${whenLocal} — con ${appointment.artist.name}`,
      content: `
        ${heading('¡Turno confirmado!')}
        ${paragraph(`Hola ${esc(appointment.customerName)}, tu turno quedó reservado. Te esperamos.`)}
        ${dataTable(this.buildAppointmentRows(appointment, whenLocal))}
        ${paragraph('¿Necesitás cambiar algo o tenés una duda? Escribinos y lo resolvemos.')}
        ${button(EMAIL_CONTACT.whatsappLink, 'Escribinos por WhatsApp')}
      `,
    });
  }

  /**
   * El código es lo único que el destinatario necesita de este mail, así que
   * va grande, en monoespaciada y aislado en su propio bloque: se lo va a
   * copiar a mano o leer en voz alta al llegar al estudio.
   */
  private buildGiftCardEmailHtml(giftCard: GiftCardForEmail, isGift: boolean): string {
    const amountLabel = Number(giftCard.amount).toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    });
    const recipientName = giftCard.recipientName ?? '';

    const intro = isGift
      ? `
        ${paragraph(`${recipientName ? `Hola ${esc(recipientName)},` : 'Hola,'}`)}
        ${paragraph(`<strong>${esc(giftCard.purchaserName)}</strong> te regaló una gift card de Freaky Monster Tattoo Studio. Usala en el diseño que quieras, con el tatuador que quieras.`)}
      `
      : `
        ${paragraph(`Hola ${esc(giftCard.purchaserName)}, tu gift card ya está lista.`)}
      `;

    // La dedicatoria solo se muestra cuando el mail va a un tercero: mostrarle
    // al comprador el texto que él mismo escribió no aporta nada.
    const dedication = isGift && giftCard.message ? quote(giftCard.message) : '';

    const expiryRow = giftCard.expiresAt
      ? [{ label: 'Válida hasta', value: formatLocalDate(giftCard.expiresAt) }]
      : [];

    return emailShell({
      title: isGift ? 'Te regalaron un tatuaje' : 'Tu gift card',
      preheader: `${amountLabel} para usar en Freaky Monster Tattoo Studio`,
      content: `
        ${heading(isGift ? '¡Te regalaron un tatuaje!' : 'Tu gift card está lista')}
        ${intro}
        ${dedication}
        ${amountBlock(amountLabel, 'Valor de la gift card')}
        ${codeBlock(giftCard.code ?? '')}
        ${expiryRow.length > 0 ? dataTable(expiryRow) : ''}
        ${paragraph('Para usarla, escribinos con el código y coordinamos el turno.')}
        ${button(EMAIL_CONTACT.whatsappLink, 'Coordinar mi turno')}
      `,
    });
  }

  private buildStudioEmailHtml(appointment: AppointmentForEmail, whenLocal: string): string {
    return emailShell({
      title: 'Nueva reserva confirmada',
      preheader: `${appointment.customerName} — ${whenLocal}`,
      content: `
        ${heading('Nueva reserva confirmada')}
        ${paragraph('Entró un turno nuevo por el sitio y ya está confirmado.')}
        ${dataTable([
          { label: 'Cliente', value: appointment.customerName },
          ...this.buildAppointmentRows(appointment, whenLocal),
          { label: 'ID del turno', value: appointment.id },
        ])}
      `,
    });
  }
}
