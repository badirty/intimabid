import GhostLogo from '@/components/brand/GhostLogo';

export default function UserAvatar({
  src,
  name = 'user',
  size = 40,
  className = '',
  rounded = 'rounded-full',
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`${rounded} object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  const initial = name.replace(/^@/, '').charAt(0).toUpperCase() || '?';

  return (
    <div
      className={`${rounded} bg-accent/15 flex items-center justify-center shrink-0 font-bold text-accent ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initial === '?' ? <GhostLogo size={Math.round(size * 0.55)} /> : initial}
    </div>
  );
}