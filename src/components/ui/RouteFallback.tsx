export const RouteFallback = () => (
  <div className="flex items-center justify-center py-24" role="status">
    <span
      className="w-6 h-6 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin"
      aria-hidden="true"
    />
    <span className="sr-only">Loading</span>
  </div>
);
