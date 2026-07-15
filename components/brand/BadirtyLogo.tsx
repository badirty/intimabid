import Image from 'next/image';

const SIZES = {
  header: { src: '/brand/badirty-wordmark-header.png', width: 73, height: 32 },
  hero: { src: '/brand/badirty-wordmark-hero.png', width: 147, height: 64 },
  email: { src: '/brand/badirty-wordmark-email.png', width: 184, height: 80 },
} as const;

export type BadirtyLogoSize = keyof typeof SIZES;

export default function BadirtyLogo({
  size = 'header',
  className = '',
  priority = false,
}: {
  size?: BadirtyLogoSize;
  className?: string;
  priority?: boolean;
}) {
  const { src, width, height } = SIZES[size];

  return (
    <Image
      src={src}
      alt="badirty"
      width={width}
      height={height}
      className={className}
      priority={priority}
      style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
    />
  );
}