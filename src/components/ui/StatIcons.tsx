"use client";

/** Jersey icon for matches/appearances */
export function JerseyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.5 2L21 6.5V10L18 9V20H6V9L3 10V6.5L7.5 2H10L12 4L14 2H16.5Z" />
    </svg>
  );
}

/** Football/soccer ball icon for goals */
export function BallIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2L14.5 8.5H18L15 12L17 18.5L12 15L7 18.5L9 12L6 8.5H9.5L12 2Z" />
    </svg>
  );
}

/** Yellow card */
export function YellowCard({ className = "w-3 h-4" }: { className?: string }) {
  return <span className={`${className} inline-block rounded-sm bg-yellow-400`} />;
}

/** Red card */
export function RedCard({ className = "w-3 h-4" }: { className?: string }) {
  return <span className={`${className} inline-block rounded-sm bg-red-500`} />;
}
