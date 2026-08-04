export default function Lightning({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 34 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M22 2 L6 32 L16 32 L11 58 L29 26 L18 26 Z" />
    </svg>
  );
}
