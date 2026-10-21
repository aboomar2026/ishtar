import type { CSSProperties } from 'react';
import { brand } from '@/lib/brand';

/**
 * Variants:
 *  - `full`     large lockup — footer, login
 *  - `header`   horizontal lockup for the storefront header
 *  - `sidebar` / `admin`   lockup for the admin sidebar/drawer
 *  - `compact`  badge icon only — tight mobile / icon slots
 *  - `mark`     bare icon, no container (inherits size from context)
 *  - `print`    mono lockup for invoices & packing slips
 */
type BrandLogoVariant = 'full' | 'header' | 'sidebar' | 'admin' | 'compact' | 'mark' | 'print';

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  /** Kept for backward compatibility. The active profile owns the displayed name. */
  name?: string;
  /** Subtitle shown below the logo mark in sidebar / print contexts. Pass null to hide. */
  subtitle?: string | null;
  className?: string;
  style?: CSSProperties;
};

const ALT = `${brand.name} — ${brand.englishName}`;

function FallbackMark({ className, print = false }: { className?: string; print?: boolean }) {
  return (
    <span
      className={`brandLogoFallbackMark${print ? ' brandLogoFallbackMark--print' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {brand.monogram}
    </span>
  );
}

function TextLockup({ subtitle }: { subtitle?: string | null }) {
  return (
    <span className="brandLogoText">
      <strong>{brand.name}</strong>
      {subtitle !== null ? <span className="brandLogoSub">{subtitle ?? brand.tagline}</span> : null}
    </span>
  );
}

/** Kept for backward compatibility — used directly by print templates. */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  if (brand.assets.monoPrimary) {
    return (
      <img
        src={brand.assets.monoPrimary}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        className={className}
        style={{ objectFit: 'contain', display: 'block' }}
      />
    );
  }

  return <FallbackMark className={className} print />;
}

export function BrandLogo({
  variant = 'header',
  subtitle,
  className,
  style
}: Omit<BrandLogoProps, 'name'> & { name?: string }) {
  if (brand.key === 'ishtar' && variant === 'print') {
    return <span className={`brandLogo brandLogo--print ${className ?? ''}`.trim()} style={style}><img src="/brand/ishtar/ishtar-arabic-wordmark-burgundy.svg" width={140} height={52} alt={ALT} style={{objectFit:'contain'}} /></span>;
  }

  if (brand.key === 'ishtar' && variant === 'header') {
    return <span className={`brandLogo brandLogo--header ${className ?? ''}`.trim()} style={style}>
      <picture><source media="(max-width: 600px)" srcSet="/brand/ishtar/ishtar-arabic-wordmark-brand.svg" /><img src="/brand/ishtar/ishtar-horizontal-brand.svg" width={170} height={67} alt={ALT} className="ishtarHeaderLogo" /></picture>
    </span>;
  }

  if (brand.key === 'ishtar' && (variant === 'sidebar' || variant === 'admin')) {
    return <span className={`brandLogo brandLogo--sidebar ${className ?? ''}`.trim()} style={style}><img src="/brand/ishtar/ishtar-arabic-wordmark-brand.svg" width={124} height={45} alt={ALT} style={{objectFit:'contain'}} /></span>;
  }

  if (variant === 'mark') {
    return (
      <span className={`brandLogoMark ${className ?? ''}`.trim()} style={style} aria-hidden="true">
        {brand.assets.icon ? (
          <img
            src={brand.assets.icon}
            width={28}
            height={28}
            alt=""
            aria-hidden="true"
            style={{ objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <FallbackMark />
        )}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <span className={`brandLogo brandLogo--compact ${className ?? ''}`.trim()} style={style}>
        <span className="brandLogoMark">
          {brand.assets.iconBadge ? (
            <img
              src={brand.assets.iconBadge}
              width={27}
              height={27}
              alt={ALT}
              style={{ objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <FallbackMark />
          )}
        </span>
      </span>
    );
  }

  if (brand.key === 'ishtar' && variant === 'full') {
    return <span className={`brandLogo brandLogo--full ${className ?? ''}`.trim()} style={style} role="img" aria-label={ALT}>
      <img className="ishtarFullOnLight" src="/brand/ishtar/ishtar-horizontal-brand.svg" width={260} height={103} alt="" aria-hidden="true" />
      <img className="ishtarFullOnDark" src="/brand/ishtar/ishtar-horizontal-reverse.svg" width={260} height={103} alt="" aria-hidden="true" />
    </span>;
  }

  if (variant === 'full' && brand.assets.full) {
    return (
      <span className={`brandLogo brandLogo--full ${className ?? ''}`.trim()} style={style}>
        <img
          src={brand.assets.full}
          height={96}
          alt={ALT}
          style={{ objectFit: 'contain', maxWidth: '100%', display: 'block' }}
        />
      </span>
    );
  }

  if (variant === 'print') {
    return (
      <span className={`brandLogo brandLogo--print ${className ?? ''}`.trim()} style={style}>
        <span className="brandLogoMark">
          {brand.assets.monoPrimary ? (
            <img
              src={brand.assets.monoPrimary}
              height={32}
              alt={ALT}
              style={{ objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <FallbackMark print />
          )}
        </span>
        <TextLockup subtitle={subtitle} />
      </span>
    );
  }

  const isSidebar = variant === 'sidebar' || variant === 'admin';
  const cls = isSidebar ? 'sidebar' : variant === 'full' ? 'full' : 'header';
  const h = isSidebar ? 30 : 34;

  if (brand.assets.header && variant !== 'full') {
    return (
      <span className={`brandLogo brandLogo--${cls} ${className ?? ''}`.trim()} style={style}>
        <img
          src={brand.assets.header}
          height={h}
          alt={ALT}
          style={{ objectFit: 'contain', display: 'block' }}
        />
        {subtitle !== undefined && subtitle !== null ? <span className="brandLogoSub">{subtitle}</span> : null}
      </span>
    );
  }

  return (
    <span className={`brandLogo brandLogo--${cls} ${className ?? ''}`.trim()} style={style} aria-label={ALT}>
      <span className="brandLogoMark"><FallbackMark /></span>
      <TextLockup subtitle={subtitle} />
    </span>
  );
}
