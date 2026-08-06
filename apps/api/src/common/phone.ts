// Bundle "max" y no el default: es el único que combina las dos cosas que
// necesitamos. El default ("min") valida cualquier tipo de número pero no sabe
// decir si es celular o fijo, y el "mobile" sabe distinguirlos pero considera
// inválido todo lo que no sea celular — con ese, una línea fija válida se
// rechaza antes de llegar a la desambiguación de abajo.
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

/**
 * País asumido cuando el número llega sin código internacional. El wizard y el
 * panel mandan siempre E.164 (el input tiene selector de país), pero el
 * backend no puede depender de eso: es una API pública y el default tiene que
 * ser el caso real del estudio.
 */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'AR';

/**
 * Devuelve el número en E.164 ("+5492617199005") o null si no es válido.
 *
 * La numeración argentina tiene particularidades (el 9 de los móviles, el 0 de
 * larga distancia, el viejo 15) que no replicamos a mano: las resuelve
 * libphonenumber-js, igual que las de cualquier otro país para el caso del
 * turista.
 *
 * Lo único que agregamos es una desambiguación propia de Argentina: un número
 * de 10 dígitos escrito sin 9 ni 15 ("261 719 9005") es, para la librería, una
 * línea fija válida — pero es también la forma en que casi todo el mundo
 * escribe su celular en un formulario. Como este teléfono existe para
 * contactar por WhatsApp, cuando el número no da móvil probamos la variante
 * móvil y la usamos si la librería la valida. El costo es que una línea fija
 * de verdad se guarda como celular; para este negocio es el error menos malo:
 * un fijo no sirve para WhatsApp, que es el único uso que tiene el campo.
 */
export function toE164(rawPhone: string, country: CountryCode = DEFAULT_PHONE_COUNTRY): string | null {
  const parsed = parsePhoneNumberFromString(rawPhone, country);
  if (!parsed?.isValid()) return null;
  if (parsed.getType() === 'MOBILE') return parsed.number;

  if (parsed.country === 'AR') {
    const asMobile = parsePhoneNumberFromString(`+549${parsed.nationalNumber}`, 'AR');
    if (asMobile?.isValid() && asMobile.getType() === 'MOBILE') return asMobile.number;
  }

  return parsed.number;
}
