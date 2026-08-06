// Bundle "max" y no el default: es el único que valida cualquier tipo de
// número Y sabe si es celular o fijo, las dos cosas que necesita la
// desambiguación argentina de phoneToE164 (el "min" no distingue tipo; el
// "mobile" rechaza las líneas fijas como inválidas). Todo lo que se importe de
// libphonenumber-js en el cliente tiene que salir de este mismo bundle:
// mezclar dos embarcaría dos copias de la metadata.
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export const DEFAULT_COUNTRY: CountryCode = "AR";

/** E.164: "+" y entre 8 y 15 dígitos, el primero distinto de 0. */
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * Convierte lo que escribió el usuario a E.164 ("+5492617199005"), o null si
 * no es un número válido para ese país. Es lo que se manda al backend: los
 * teléfonos se normalizan al guardar, no al mostrar.
 *
 * La desambiguación argentina (un número sin 9 ni 15 parsea como línea fija,
 * pero es como la gente escribe su celular) está explicada en detalle en el
 * gemelo de este archivo del backend, apps/api/src/common/phone.ts — que es
 * el que manda: acá se replica para poder validar en vivo sin ida y vuelta.
 */
export function phoneToE164(rawPhone: string, country: CountryCode = DEFAULT_COUNTRY): string | null {
  const parsed = parsePhoneNumberFromString(rawPhone, country);
  if (!parsed?.isValid()) return null;
  if (parsed.getType() === "MOBILE") return parsed.number;

  if (parsed.country === "AR") {
    const asMobile = parsePhoneNumberFromString(`+549${parsed.nationalNumber}`, "AR");
    if (asMobile?.isValid() && asMobile.getType() === "MOBILE") return asMobile.number;
  }

  return parsed.number;
}

/**
 * URL de wa.me, o null si el número no sirve.
 *
 * El camino principal es trivial porque los teléfonos ya vienen normalizados
 * de la base: wa.me quiere exactamente el E.164 sin el "+".
 *
 * El parseo de abajo es solo tolerancia para los turnos viejos, guardados tal
 * como los tipeó el cliente antes de esta normalización (no se migraron). Si
 * ni así se puede interpretar, devuelve null: mandar a WhatsApp a un número
 * mal armado es peor que no ofrecer el link.
 */
export function whatsAppUrl(phone: string): string | null {
  if (E164_PATTERN.test(phone)) return `https://wa.me/${phone.slice(1)}`;

  const legacy = phoneToE164(phone);
  return legacy ? `https://wa.me/${legacy.slice(1)}` : null;
}

/**
 * Formato legible para el panel ("+54 9 261 719-9005"): mostrar el E.164 crudo
 * es correcto pero ilegible de un vistazo. Si el número no se puede parsear
 * —un teléfono viejo mal cargado— se muestra tal cual está guardado en vez de
 * esconderlo.
 */
export function formatPhoneForDisplay(phone: string): string {
  // Se formatea el número YA normalizado, no el crudo: para un teléfono viejo
  // guardado como "2616518426", formatear el crudo mostraría el número como
  // línea fija mientras el link de al lado apunta al móvil. Lo que se ve tiene
  // que ser lo que se marca.
  const parsed = parsePhoneNumberFromString(phoneToE164(phone) ?? phone, DEFAULT_COUNTRY);
  return parsed?.isValid() ? parsed.formatInternational() : phone;
}
