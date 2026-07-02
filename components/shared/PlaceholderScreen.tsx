export default function PlaceholderScreen({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center animate-slide-up">
      <span className="text-5xl mb-4">{emoji}</span>
      <h2 className="font-extrabold text-lg text-text" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
      <p className="text-text-2 text-sm mt-2">{subtitle}</p>
    </div>
  );
}