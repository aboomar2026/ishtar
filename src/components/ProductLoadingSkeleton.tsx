export function ProductLoadingSkeleton() {
  return <div className="productLoadingSkeleton" role="status" aria-label="جارٍ تحميل تفاصيل المنتج">
    <span className="loadingSkeletonCaption"><span className="ishtarSpinner" aria-hidden="true" />جارٍ تحميل تفاصيل المنتج…</span>
    <div className="productLoadingGrid" aria-hidden="true">
      <div className="productLoadingPhoto skeletonSurface" />
      <div className="productLoadingDetails"><span className="skeletonSurface" /><span className="skeletonSurface" /><span className="skeletonSurface" /><div className="productLoadingOptions"><i className="skeletonSurface" /><i className="skeletonSurface" /><i className="skeletonSurface" /></div><span className="skeletonSurface" /></div>
    </div>
  </div>;
}
