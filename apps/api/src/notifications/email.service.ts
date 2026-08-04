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
   * Dispara los emails de confirmación de un turno recién CONFIRMED. Nunca
   * tira una excepción hacia afuera: un email caído no puede voltear la
   * confirmación del turno ni la respuesta al webhook de Mercado Pago que
   * la disparó. Cualquier falla queda logueada, no silenciada del todo.
   */
  async sendAppointmentConfirmation(appointment: AppointmentForEmail): Promise<void> {
    const whenLocal = formatLocalDateTime(appointment.startTime);

    // Al cliente, solo si dejó email (customerEmail es opcional en el DTO).
    if (appointment.customerEmail) {
      await this.trySend({
        to: appointment.customerEmail,
        subject: 'Tu turno en Freaky Monster Tattoo Studio está confirmado',
        html: this.buildCustomerEmailHtml(appointment, whenLocal),
      });
    }

    // Al estudio, siempre.
    await this.trySend({
      to: this.studioEmail,
      subject: `Nueva reserva confirmada — ${appointment.customerName}`,
      html: this.buildStudioEmailHtml(appointment, whenLocal),
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

  private buildCustomerEmailHtml(appointment: AppointmentForEmail, whenLocal: string): string {
    return `
      <div style="font-family: sans-serif; line-height: 1.5; color: #1a1a1a;">
        <h2>¡Turno confirmado!</h2>
        <p>Hola ${appointment.customerName},</p>
        <p>Tu turno en <strong>Freaky Monster Tattoo Studio</strong> quedó confirmado:</p>
        <ul>
          <li><strong>Tatuador/a:</strong> ${appointment.artist.name}</li>
          <li><strong>Servicio:</strong> ${appointment.service.name}</li>
          <li><strong>Fecha y hora:</strong> ${whenLocal} (hora Mendoza)</li>
        </ul>
        <p>Cualquier consulta, escribinos por WhatsApp al ${STUDIO_WHATSAPP}.</p>
        <p>¡Te esperamos!</p>
      </div>
    `;
  }

  private buildStudioEmailHtml(appointment: AppointmentForEmail, whenLocal: string): string {
    return `
      <div style="font-family: sans-serif; line-height: 1.5; color: #1a1a1a;">
        <h2>Nueva reserva confirmada</h2>
        <ul>
          <li><strong>Cliente:</strong> ${appointment.customerName}</li>
          <li><strong>Tatuador/a:</strong> ${appointment.artist.name}</li>
          <li><strong>Servicio:</strong> ${appointment.service.name}</li>
          <li><strong>Fecha y hora:</strong> ${whenLocal} (hora Mendoza)</li>
          <li><strong>ID del turno:</strong> ${appointment.id}</li>
        </ul>
      </div>
    `;
  }
}
