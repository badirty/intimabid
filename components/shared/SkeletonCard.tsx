export default function SkeletonCard() {
  return (
    <div className="ui-card overflow-hidden animate-pulse">
      <div className="h-40 bg-white/5" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-20 bg-white/5 rounded" />
        <div className="h-4 w-3/4 bg-white/5 rounded" />
        <div className="h-6 w-16 bg-white/5 rounded ml-auto" />
      </div>
    </div>
  );
}