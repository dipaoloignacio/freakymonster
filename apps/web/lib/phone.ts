/**
 * Los teléfonos se guardan tal cual los escribió el cliente ("261 555-1234",
 * "+54 9 261 555-0000", "0261 15 555-1234"…), así que hay que normalizarlos
 * antes de armar un link de wa.me, que espera solo dígitos con código de país.
 *
 * Criterio: se prefiere NO generar link antes que generar uno equivocado —
 * un link roto manda a WhatsApp a un número ajeno, que es peor que copiar el
 * número a mano. Por eso todo lo que no termine en un número argentino de 10
 * dígitos (código de área + abonado) devuelve null.
 */

/** Móvil argentino en formato wa.me: 54 + 9 + 10 dígitos nacionales. */
const AR_MOBILE_PREFIX = "549";
const AR_NATIONAL_LENGTH = 10;

export function toWhatsAppNumber(rawPhone: string): string | null {
  let digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  // Prefijo de salida internacional (00 54 …).
  if (digits.startsWith("00")) digits = digits.slice(2);

  let national: string;
  if (digits.startsWith("54")) {
    national = digits.slice(2);
    // El 9 de móvil ya viene incluido: se saca acá y se vuelve a poner al
    // final, para no depender de si el cliente lo escribió o no.
    if (national.startsWith("9")) national = national.slice(1);
  } else {
    national = digits;
  }

  // Prefijo troncal nacional (0261 …).
  if (national.startsWith("0")) national = national.slice(1);

  // "15" de móvil a la vieja usanza (261 15 555-1234). Solo se saca cuando
  // el resultado da exactamente los 10 dígitos esperados, para no mutilar un
  // número que casualmente tenga un 15 en esa posición.
  if (national.length === AR_NATIONAL_LENGTH + 2 && national.slice(3, 5) === "15") {
    national = national.slice(0, 3) + national.slice(5);
  }

  if (national.length !== AR_NATIONAL_LENGTH) return null;

  return `${AR_MOBILE_PREFIX}${national}`;
}

/** URL de wa.me lista para usar, o null si el número no es utilizable. */
export function whatsAppUrl(rawPhone: string): string | null {
  const number = toWhatsAppNumber(rawPhone);
  return number ? `https://wa.me/${number}` : null;
}
