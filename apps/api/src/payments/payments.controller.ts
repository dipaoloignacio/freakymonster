import { Body, Controller, HttpCode, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('appointments/:id/payment-preference')
  createPaymentPreference(@Param('id') id: string) {
    return this.paymentsService.createPaymentPreference(id);
  }

  // Misma forma que la de turnos, pero cobra el total de la gift card y su
  // external_reference lleva el prefijo que el webhook usa para distinguirlas.
  @Post('gift-cards/:id/payment-preference')
  createGiftCardPaymentPreference(@Param('id') id: string) {
    return this.paymentsService.createGiftCardPaymentPreference(id);
  }

  // Mercado Pago manda una notificación liviana (tipo de evento + id), no el
  // detalle completo, y el formato varía según cómo esté configurado el
  // webhook: a veces viene en el body, a veces en query params. Siempre
  // respondemos 200 una vez procesada (aunque no confirmemos el turno) para
  // que MP no reintente de más; un error real (ej. no pudimos ni consultar
  // el pago) sí debe propagar como 5xx para que MP reintente más tarde.
  @Post('payments/webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: Record<string, any>, @Query() query: Record<string, any>) {
    const type = body?.type ?? body?.topic ?? query?.type ?? query?.topic;
    const paymentId = body?.data?.id ?? query?.['data.id'] ?? query?.id;

    if (type !== 'payment' || !paymentId) {
      // Otros tipos de evento (merchant_order, etc.) o payload sin id: nada
      // que procesar de nuestro lado, pero igual 200 para no generar
      // reintentos infinitos de un evento que nunca vamos a manejar.
      return { received: true };
    }

    await this.paymentsService.handlePaymentNotification(paymentId);
    return { received: true };
  }
}
