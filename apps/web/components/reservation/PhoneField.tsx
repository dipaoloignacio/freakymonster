"use client";

import { useMemo } from "react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/max";
import { DEFAULT_COUNTRY, phoneToE164 } from "@/lib/phone";

/** 🇦🇷 a partir del código ISO: cada letra tiene su "regional indicator". */
function flagOf(country: CountryCode): string {
  return String.fromCodePoint(
    ...country.split("").map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)
  );
}

interface CountryOption {
  country: CountryCode;
  callingCode: string;
  label: string;
}

function buildCountryOptions(): CountryOption[] {
  // Los nombres de país no vienen en libphonenumber-js; Intl los tiene y ya
  // está en el runtime. Si el navegador no lo soporta, el código ISO alcanza
  // para no dejar la lista inutilizable.
  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames(["es-AR"], { type: "region" });
  } catch {
    displayNames = null;
  }

  const options = getCountries().map((country) => {
    const callingCode = getCountryCallingCode(country);
    const name = displayNames?.of(country) ?? country;
    return { country, callingCode, label: `${name} (+${callingCode})` };
  });

  options.sort((a, b) => a.label.localeCompare(b.label, "es"));

  // Argentina primero: es el caso de casi todos los clientes del estudio.
  const argentinaIndex = options.findIndex((o) => o.country === DEFAULT_COUNTRY);
  if (argentinaIndex > 0) {
    options.unshift(options.splice(argentinaIndex, 1)[0]);
  }
  return options;
}

/**
 * Input de teléfono con selector de país. El usuario escribe solo su número
 * local ("261 719 9005") y el componente arma el E.164 que viaja al backend.
 *
 * El selector es un <select> nativo transparente estirado sobre la etiqueta
 * "🇦🇷 +54": así el caso común (Argentina) ocupa poco y no compite con el
 * input, pero al abrirlo se ve la lista completa con los nombres de país y
 * funciona el type-ahead del navegador — cosa que se perdería si las opciones
 * fueran solo códigos, y que hace falta para el turista que busca el suyo.
 */
export function PhoneField({
  value,
  onChange,
  country,
  onCountryChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  error?: string | null;
}) {
  const countryOptions = useMemo(buildCountryOptions, []);
  const callingCode = getCountryCallingCode(country);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-ash">Teléfono *</span>

      <div className="flex gap-2">
        <div
          className={`clip-notch-sm relative flex shrink-0 items-center gap-1 border-2 bg-ink px-3 py-2.5 text-sm text-bone ${
            error ? "border-gore" : "border-plum"
          }`}
        >
          <span aria-hidden="true">{flagOf(country)}</span>
          <span>+{callingCode}</span>
          <span aria-hidden="true" className="text-ash">
            ▾
          </span>
          {/* Los colores van también en las <option>, no solo en el <select>:
              el select está en opacity-0 (lo visible es la etiqueta de arriba),
              pero la lista desplegada la pinta el navegador con SUS valores por
              defecto —fondo blanco— mientras el texto hereda el bone claro del
              sitio, y queda blanco sobre blanco. El bg del <select> cubre a
              Firefox, que toma de ahí el fondo de la lista; el de las <option>
              cubre a Chrome/Edge. Safari ignora ambos y usa el dropdown del
              sistema: limitación conocida de WebKit, no hay cómo forzarlo. */}
          <select
            aria-label="Código de país"
            value={country}
            onChange={(e) => onCountryChange(e.target.value as CountryCode)}
            className="absolute inset-0 cursor-pointer bg-panel text-bone opacity-0 [&>option]:bg-panel [&>option]:text-bone"
          >
            {countryOptions.map((option) => (
              <option key={option.country} value={option.country}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="261 719 9005"
          required
          aria-invalid={Boolean(error)}
          className={`clip-notch-sm min-w-0 flex-1 border-2 bg-ink px-4 py-2.5 text-sm text-bone outline-none focus:border-gore ${
            error ? "border-gore" : "border-plum"
          }`}
        />
      </div>

      {error && <span className="text-sm font-semibold text-gore">{error}</span>}
    </label>
  );
}

/**
 * Mensaje de validación en vivo: null cuando está todo bien o cuando todavía
 * no hay nada escrito (no se le grita al usuario por un campo que ni empezó).
 */
export function phoneValidationError(rawPhone: string, country: CountryCode): string | null {
  if (!rawPhone.trim()) return null;
  if (phoneToE164(rawPhone, country)) return null;
  return "Ese número no parece válido para el país elegido.";
}
