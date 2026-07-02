export default function StatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center justify-between px-5 py-2 text-[11px] font-semibold text-text-on-dark header-dark">
      <span>{time}</span>
      <div className="flex items-center gap-1.5">
        <span>●●●●</span>
        <span>WiFi</span>
        <span className="border border-white/60 rounded px-1 text-[10px]">100%</span>
      </div>
    </div>
  );
}