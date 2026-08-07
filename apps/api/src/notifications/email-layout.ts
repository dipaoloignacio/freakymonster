import { FRONTEND_BASE_URL } from '../common/site';

/**
 * Ladrillos para armar el HTML de los emails.
 *
 * Todo está hecho con <table> y atributos HTML viejos (bgcolor, align,
 * cellpadding) en vez de CSS moderno, y no por gusto: Outlook de escritorio
 * renderiza con el motor de Word, que no soporta flexbox ni grid ni
 * border-radius, y Gmail borra cualquier <style> con selectores. Lo único que
 * se comporta parecido en todos lados son tablas anidadas y estilos inline.
 *
 * Por el mismo motivo:
 * - nada de @font-face: se usa la pila de fuentes del sistema;
 * - fondo claro y no el ink del sitio, porque varios clientes fuerzan sus
 *   propios colores sobre fondos oscuros y el resultado es impredecible;
 * - los colores van en hex de seis dígitos, no en oklch() como el sitio: los
 *   espacios de color modernos no existen en la mayoría de estos motores.
 */

/** Paleta del sitio traducida a hex, que es lo único que entiende el email. */
export const EMAIL_COLORS = {
  /** `gore`, el acento de la marca. Mismo valor que se usó para Cal.com. */
  gore: '#f034a3',
  ink: '#0d0b0a',
  text: '#1f1c1a',
  muted: '#6b6560',
  /** Fondo de la ventana, apenas gris para que la tarjeta blanca se despegue. */
  canvas: '#f4f2f0',
  card: '#ffffff',
  border: '#e2ddd8',
} as const;

/**
 * Pila de fuentes del sistema. Arial y Helvetica al final son las que
 * realmente van a usar Outlook y los webmails viejos; las primeras solo
 * mejoran el resultado donde se puede.
 */
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif";

const STUDIO_WHATSAPP_DISPLAY = '+54 9 261 719-9005';
const STUDIO_WHATSAPP_LINK = 'https://wa.me/5492617199005';
const STUDIO_ADDRESS = 'Garibaldi 7, M5500 Mendoza, Argentina';

const LOGO_URL = `${FRONTEND_BASE_URL}/email-logo.png`;

/**
 * Escapa lo que viene de afuera antes de meterlo en el HTML.
 *
 * Hace falta de verdad: el nombre del cliente, la dedicatoria de una gift card
 * y el nombre de un servicio los escribe una persona, y un `<` suelto rompe el
 * mail (o peor, mete markup en el mail que le llega al estudio).
 */
export function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Documento completo: fondo, tarjeta centrada de 600px, logo, contenido y pie.
 *
 * 600px es el ancho de siempre para email — es lo que entra sin scroll
 * horizontal en el panel de lectura de Outlook, que es el más angosto.
 *
 * `preheader` es la línea de texto que la bandeja de entrada muestra al lado
 * del asunto. Si no se define, los clientes agarran las primeras palabras del
 * cuerpo, que acá serían "Ver este mail" o el alt del logo.
 */
export function emailShell(options: {
  title: string;
  preheader: string;
  content: string;
}): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(options.title)}</title>
</head>
<body style="margin:0; padding:0; background-color:${EMAIL_COLORS.canvas};">
<div style="display:none; font-size:1px; color:${EMAIL_COLORS.canvas}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${esc(options.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL_COLORS.canvas}" style="background-color:${EMAIL_COLORS.canvas};">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%; background-color:${EMAIL_COLORS.card}; border:1px solid ${EMAIL_COLORS.border};">
        <tr>
          <td align="center" style="padding:28px 24px 8px 24px;">
            <img src="${LOGO_URL}" width="220" alt="Freaky Monster Tattoo Studio" style="display:block; width:220px; max-width:70%; height:auto; border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px 32px; font-family:${FONT_STACK}; font-size:15px; line-height:1.55; color:${EMAIL_COLORS.text};">
            ${options.content}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="1" bgcolor="${EMAIL_COLORS.border}" style="height:1px; line-height:1px; font-size:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 32px 28px 32px; font-family:${FONT_STACK}; font-size:12px; line-height:1.6; color:${EMAIL_COLORS.muted};">
            <strong style="color:${EMAIL_COLORS.text};">Freaky Monster Tattoo Studio</strong><br>
            ${STUDIO_ADDRESS}<br>
            WhatsApp: <a href="${STUDIO_WHATSAPP_LINK}" style="color:${EMAIL_COLORS.gore}; text-decoration:none;">${STUDIO_WHATSAPP_DISPLAY}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Título principal adentro del cuerpo. */
export function heading(text: string): string {
  return `<h1 style="margin:12px 0 16px 0; font-family:${FONT_STACK}; font-size:24px; line-height:1.25; font-weight:bold; color:${EMAIL_COLORS.ink};">${esc(text)}</h1>`;
}

export function paragraph(html: string, extraStyle = ''): string {
  return `<p style="margin:0 0 14px 0; ${extraStyle}">${html}</p>`;
}

/**
 * Los datos duros, en una tabla de etiqueta/valor.
 *
 * Reemplaza a la <ul> que había antes: las viñetas de una lista se ven
 * distintas en cada cliente (y Outlook les mete una sangría propia), mientras
 * que una tabla con dos columnas queda igual en todos y además alinea los
 * valores, que es lo que uno viene a leer.
 */
export function dataTable(rows: { label: string; value: string }[]): string {
  const body = rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:9px 14px; font-family:${FONT_STACK}; font-size:12px; text-transform:uppercase; letter-spacing:0.6px; color:${EMAIL_COLORS.muted}; white-space:nowrap; vertical-align:top;">${esc(label)}</td>
          <td style="padding:9px 14px 9px 0; font-family:${FONT_STACK}; font-size:15px; font-weight:bold; color:${EMAIL_COLORS.text}; vertical-align:top;">${esc(value)}</td>
        </tr>`,
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0; border:1px solid ${EMAIL_COLORS.border}; border-left:3px solid ${EMAIL_COLORS.gore};">
      ${body}
    </table>`;
}

/**
 * Botón "a prueba de balas": una tabla con fondo, no un <a> con padding.
 *
 * Outlook ignora el padding de un <a>, así que un botón hecho así se ve como
 * un link de texto suelto. Con la tabla, el color de fondo lo pinta el <td> —
 * que Outlook sí respeta— y el <a> solo aporta el área clickeable.
 */
export function button(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;">
      <tr>
        <td bgcolor="${EMAIL_COLORS.gore}" style="background-color:${EMAIL_COLORS.gore};">
          <a href="${href}" style="display:inline-block; padding:13px 28px; font-family:${FONT_STACK}; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; color:#ffffff; text-decoration:none;">${esc(label)}</a>
        </td>
      </tr>
    </table>`;
}

/**
 * El código de la gift card. Es lo único que el destinatario necesita del mail
 * —lo va a copiar a mano o dictarlo en el mostrador—, así que va grande, en
 * monoespaciada, con espaciado entre letras y aislado en su propio bloque.
 */
export function codeBlock(code: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
      <tr>
        <td align="center" bgcolor="${EMAIL_COLORS.ink}" style="background-color:${EMAIL_COLORS.ink}; padding:22px 16px; border:2px solid ${EMAIL_COLORS.gore};">
          <div style="font-family:${FONT_STACK}; font-size:11px; text-transform:uppercase; letter-spacing:2px; color:#a8a29b; margin-bottom:10px;">Tu código</div>
          <div style="font-family:'Courier New', Courier, monospace; font-size:30px; font-weight:bold; letter-spacing:4px; color:${EMAIL_COLORS.gore}; white-space:nowrap;">${esc(code)}</div>
        </td>
      </tr>
    </table>`;
}

/** El monto, destacado en el color de la marca. */
export function amountBlock(amountLabel: string, caption: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0; border:1px solid ${EMAIL_COLORS.border};">
      <tr>
        <td align="center" style="padding:18px 16px;">
          <div style="font-family:${FONT_STACK}; font-size:11px; text-transform:uppercase; letter-spacing:2px; color:${EMAIL_COLORS.muted}; margin-bottom:6px;">${esc(caption)}</div>
          <div style="font-family:${FONT_STACK}; font-size:32px; font-weight:bold; color:${EMAIL_COLORS.gore};">${esc(amountLabel)}</div>
        </td>
      </tr>
    </table>`;
}

/** La dedicatoria de quien regala, citada. */
export function quote(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
      <tr>
        <td style="padding:14px 18px; background-color:${EMAIL_COLORS.canvas}; border-left:3px solid ${EMAIL_COLORS.ink}; font-family:${FONT_STACK}; font-size:15px; font-style:italic; color:${EMAIL_COLORS.text};">
          ${esc(text)}
        </td>
      </tr>
    </table>`;
}

export const EMAIL_CONTACT = {
  whatsappDisplay: STUDIO_WHATSAPP_DISPLAY,
  whatsappLink: STUDIO_WHATSAPP_LINK,
  fontStack: FONT_STACK,
};
