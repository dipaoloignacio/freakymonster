import { randomInt } from 'crypto';

/**
 * Alfabeto sin caracteres que se confundan al leerlos en voz alta o escritos a
 * mano. Quedan afuera:
 *  - 0 / O / Q  (redondos)
 *  - 1 / I / L  (palitos)
 *  - 5 / S, 8 / B, 2 / Z  (se confunden dictados y manuscritos)
 * Un código de gift card se dicta por teléfono y se copia a mano de una
 * tarjeta impresa: cada par ambiguo es un canje fallido y un mensaje de
 * WhatsApp al estudio.
 */
const ALPHABET = '34679ACDEFGHJKMNPRTUVWXY';

const PREFIX = 'FM';
const GROUP_LENGTH = 4;
const GROUPS = 2;

/**
 * Vigencia por defecto de una gift card, contada desde la compra. Vive en
 * código y no como columna del tier ni default de la base: es una sola regla
 * para todo el estudio, y así cambiarla no necesita migración ni tocar cada
 * tier. Si algún día un monto necesita otra vigencia, el lugar natural es una
 * columna opcional en GiftCardTier que pise este valor.
 */
export const GIFT_CARD_VALIDITY_MONTHS = 6;

/**
 * Código tipo "FM-7K3M-XPWD".
 *
 * randomInt (CSPRNG) y no Math.random: el código ES la credencial de canje, y
 * Math.random es predecible — con suficientes códigos vistos se pueden generar
 * los siguientes.
 *
 * No garantiza unicidad por sí solo: eso lo da el @unique de GiftCard.code.
 * Quien lo use tiene que reintentar ante una colisión (P2002).
 */
export function generateGiftCardCode(): string {
  const groups = Array.from({ length: GROUPS }, () =>
    Array.from({ length: GROUP_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''),
  );

  return [PREFIX, ...groups].join('-');
}

/**
 * Fecha de vencimiento de una card comprada en `from`. Sumar meses (y no
 * días) hace que "6 meses" caiga siempre en el mismo día del mes, que es lo
 * que espera leer el cliente en la tarjeta.
 */
export function giftCardExpiryFrom(from: Date = new Date()): Date {
  const expiry = new Date(from);
  expiry.setMonth(expiry.getMonth() + GIFT_CARD_VALIDITY_MONTHS);
  return expiry;
}
