export default function Eye({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 70 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2 20 C 14 4, 56 4, 68 20 C 56 36, 14 36, 2 20 Z" />
      <circle cx="35" cy="20" r="8" />
      <circle cx="35" cy="20" r="2.2" fill="currentColor" stroke="none" />
      <path d="M12 12 L18 15" />
      <path d="M58 12 L52 15" />
    </svg>
  );
}
