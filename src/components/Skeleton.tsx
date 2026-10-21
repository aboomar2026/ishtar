export function SkeletonLoadingState() {
  return (
    <div className="skeletonGrid" aria-label="تحميل المنتجات">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="skeletonCard" key={index}>
          <div className="skeletonImage" />
          <div className="skeletonLine short" />
          <div className="skeletonLine" />
          <div className="skeletonLine tiny" />
        </div>
      ))}
    </div>
  );
}
