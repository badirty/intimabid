export default function GhostLogo({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="ghost-body" x1="12" y1="8" x2="52" y2="56">
          <stop stopColor="#e8e0ff" />
          <stop offset="1" stopColor="#c4b5fd" />
        </linearGradient>
        <linearGradient id="ghost-blush" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f9a8d4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M32 6C20 6 11 16 11 28c0 8 3 14 3 14s-4 6-2 8c2 2 8-2 10-4 2 2 8 6 10 4 2-2-2-8-2-8s3-6 3-14C43 16 44 6 32 6z"
        fill="url(#ghost-body)"
        stroke="#a78bfa"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <ellipse cx="24" cy="28" rx="4" ry="5" fill="#2d2640" opacity="0.85" />
      <ellipse cx="40" cy="28" rx="4" ry="5" fill="#2d2640" opacity="0.85" />
      <circle cx="25" cy="26" r="1.2" fill="#faf5ff" />
      <circle cx="41" cy="26" r="1.2" fill="#faf5ff" />
      <ellipse cx="32" cy="36" rx="3" ry="2" fill="#f9a8d4" opacity="0.35" />
      <path
        d="M26 40c2 2 10 2 12 0"
        stroke="#a78bfa"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}