import { SkeletonLoadingState } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="plainPage">
      <div className="pageTitleBlock">
        <span className="eyebrow">Loading</span>
        <h1>جاري التحميل...</h1>
      </div>
      <SkeletonLoadingState />
    </div>
  );
}
