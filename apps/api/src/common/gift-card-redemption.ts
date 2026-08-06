import { GiftCardStatus } from '@prisma/client';
import { formatLocalDate } from './timezone';

/** Lo mínimo que hace falta para decidir si una card se puede canjear. */
export interface RedeemableGiftCard {
  status: GiftCardStatus;
  expiresAt: Date | null;
  redeemedAt: Date | null;
}

/**
 * Motivo por el que la card NO se puede usar, o null si está lista para
 * canjear.
 *
 * El vencimiento se evalúa acá, comparando contra el momento actual, en vez
 * de tener un cron que pase las cards a EXPIRED. Un job así no agregaría
 * nada: nadie consulta el estado más que en este chequeo, así que una card
 * "vencida pero todavía ACTIVE en la base" no existe desde afuera — se
 * rechaza igual. Lo único que sumaría es una tarea más que puede fallar y un
 * momento en el que la base y la realidad no coinciden. El estado EXPIRED
 * queda para marcarlas a mano si alguna vez hace falta.
 *
 * Devuelve texto para mostrar, no un código de error, porque el panel tiene
 * que poder explicarle al admin POR QUÉ está rechazada mientras tiene al
 * cliente enfrente.
 */
export function giftCardRejectionReason(giftCard: RedeemableGiftCard): string | null {
  if (giftCard.status === GiftCardStatus.REDEEMED) {
    const when = giftCard.redeemedAt ? ` el ${formatLocalDate(giftCard.redeemedAt)}` : '';
    return `Esta gift card ya fue canjeada${when}.`;
  }

  if (giftCard.status === GiftCardStatus.PENDING) {
    // En la práctica no se llega acá buscando por código: una card PENDING
    // todavía no tiene uno. Queda por si alguna se emite a mano.
    return 'El pago de esta gift card todavía no está confirmado.';
  }

  if (giftCard.status === GiftCardStatus.EXPIRED) {
    return 'Esta gift card está marcada como vencida.';
  }

  if (giftCard.expiresAt && giftCard.expiresAt.getTime() <= Date.now()) {
    return `Esta gift card venció el ${formatLocalDate(giftCard.expiresAt)}.`;
  }

  return null;
}
