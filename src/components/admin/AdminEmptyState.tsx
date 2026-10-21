import Link from 'next/link';
import type { ReactNode } from 'react';

type AdminEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

/** Consistent admin empty state — Arabic title + optional description and a single action. */
export function AdminEmptyState({ icon, title, description, actionHref, actionLabel }: AdminEmptyStateProps) {
  return (
    <div className="adminEmptyState">
      {icon ? <span className="adminEmptyIcon" aria-hidden="true">{icon}</span> : null}
      <strong className="adminEmptyTitle">{title}</strong>
      {description ? <p className="adminEmptyDesc">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="adminBtn adminBtnGhost adminBtnSm adminEmptyAction">{actionLabel}</Link>
      ) : null}
    </div>
  );
}
