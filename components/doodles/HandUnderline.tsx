export default function HandUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M3 12 C 40 4, 80 17, 118 8 C 150 1, 185 15, 217 7" />
    </svg>
  );
}
