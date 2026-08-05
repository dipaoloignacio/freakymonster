import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { formatLocalDateTime } from '../common/timezone';

const STUDIO_WHATSAPP = '+54 9 261 719-9005';

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

  /** Cascarón común de los dos mails: mismo estilo, distinto contenido. */
  private buildEmailHtml(heading: string, body: string): string {
    return `
      <div style="font-family: sans-serif; line-height: 1.5; color: #1a1a1a;">
        <h2>${heading}</h2>
        ${body}
      </div>
    `;
  }

  /** Los datos del turno en sí, idénticos para el cliente y para el estudio.
   *  Cada destinatario agrega arriba/abajo las filas que solo le sirven a él. */
  private buildAppointmentRows(appointment: AppointmentForEmail, whenLocal: string): string {
    return `
      <li><strong>Tatuador/a:</strong> ${appointment.artist.name}</li>
      <li><strong>Servicio:</strong> ${appointment.service.name}</li>
      <li><strong>Fecha y hora:</strong> ${whenLocal} (hora Mendoza)</li>
    `;
  }

  private buildCustomerEmailHtml(appointment: AppointmentForEmail, whenLocal: string): string {
    return this.buildEmailHtml(
      '¡Turno confirmado!',
      `
        <p>Hola ${appointment.customerName},</p>
        <p>Tu turno en <strong>Freaky Monster Tattoo Studio</strong> quedó confirmado:</p>
        <ul>
          ${this.buildAppointmentRows(appointment, whenLocal)}
        </ul>
        <p>Cualquier consulta, escribinos por WhatsApp al ${STUDIO_WHATSAPP}.</p>
        <p>¡Te esperamos!</p>
      `,
    );
  }

  private buildStudioEmailHtml(appointment: AppointmentForEmail, whenLocal: string): string {
    return this.buildEmailHtml(
      'Nueva reserva confirmada',
      `
        <ul>
          <li><strong>Cliente:</strong> ${appointment.customerName}</li>
          ${this.buildAppointmentRows(appointment, whenLocal)}
          <li><strong>ID del turno:</strong> ${appointment.id}</li>
        </ul>
      `,
    );
  }
}
