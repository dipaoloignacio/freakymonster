export default function GiftBox({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      // Trazo más grueso que el resto de los doodles (1.3–1.4): esos se dibujan
      // a 60–220px y este vive a 16px en la barra. Con 1.4 a ese tamaño las
      // líneas se deshacen y la caja se lee como una mancha.
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* cuerpo */}
      <path d="M4.5 10.5 H19.5 V20 H4.5 Z" />
      {/* tapa, un poco más ancha que el cuerpo para que se lea como tapa */}
      <path d="M3 7 H21 V10.5 H3 Z" />
      {/* cinta vertical, de la tapa al piso */}
      <path d="M12 7 V20" />
      {/* moño: dos lazos que salen del mismo punto */}
      <path d="M12 7 C 11.6 4.6, 9.6 3.2, 8.5 4.3 C 7.5 5.4, 9.5 6.6, 12 7 Z" />
      <path d="M12 7 C 12.4 4.6, 14.4 3.2, 15.5 4.3 C 16.5 5.4, 14.5 6.6, 12 7 Z" />
    </svg>
  );
}
