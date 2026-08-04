export default function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed -inset-x-[10%] -inset-y-[10%] z-[200] opacity-5 mix-blend-overlay animate-grain"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 30%, #fff 0.5px, transparent 0.5px), radial-gradient(circle at 60% 70%, #fff 0.5px, transparent 0.5px)",
        backgroundSize: "3px 3px, 5px 5px",
      }}
    />
  );
}
