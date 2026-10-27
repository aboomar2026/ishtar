import Link from '@/components/NavigationLink';

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="emptyState">
      <div className="emptyIcon" aria-hidden="true">♡</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionHref && actionLabel ? <Link href={actionHref} className="primaryButton">{actionLabel}</Link> : null}
    </div>
  );
}
