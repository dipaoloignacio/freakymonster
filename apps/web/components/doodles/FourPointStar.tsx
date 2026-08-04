export default function FourPointStar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M30 3 L36 26 L57 30 L36 34 L30 57 L24 34 L3 30 L24 26 Z" />
      <circle cx="30" cy="30" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
