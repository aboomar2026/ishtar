import type { ReactNode } from 'react';

type IconProps = { size?: number };

function Svg({ size = 20, children }: IconProps & { children: ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function IconMenu(props: IconProps) { return <Svg {...props}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>; }
export function IconSearch(props: IconProps) { return <Svg {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>; }
// Clear shopping-bag silhouette: rounded body + two handle arcs (no flat "lid" line that reads as a bin).
export function IconBag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 8.5h13l-.8 10.6a1.7 1.7 0 0 1-1.7 1.6H8a1.7 1.7 0 0 1-1.7-1.6L5.5 8.5Z" />
      <path d="M8.8 8.5V7.2a3.2 3.2 0 0 1 6.4 0v1.3" />
    </Svg>
  );
}
// Shopping-cart (trolley) alternative.
export function IconCart(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
      <path d="M3 4h2.1l2.1 10.4a1.4 1.4 0 0 0 1.4 1.1h7.9a1.4 1.4 0 0 0 1.4-1.1L20.5 7.2H6.2" />
    </Svg>
  );
}
export function IconPlus(props: IconProps) { return <Svg {...props}><path d="M12 5v14M5 12h14" /></Svg>; }
export function IconX(props: IconProps) { return <Svg {...props}><path d="m6 6 12 12M18 6 6 18" /></Svg>; }
export function IconChevronDown(props: IconProps) { return <Svg {...props}><path d="m6 9 6 6 6-6" /></Svg>; }
export function IconCheck(props: IconProps) { return <Svg {...props}><path d="m5 12.5 4.5 4.5L19 7" /></Svg>; }
export function IconHeart(props: IconProps) { return <Svg {...props}><path d="M20.2 6.4a5 5 0 0 0-7.1 0L12 7.5l-1.1-1.1a5 5 0 0 0-7.1 7.1L12 21l8.2-7.5a5 5 0 0 0 0-7.1Z" /></Svg>; }
export function IconUser(props: IconProps) { return <Svg {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>; }
export function IconHome(props: IconProps) { return <Svg {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></Svg>; }
export function IconGrid(props: IconProps) { return <Svg {...props}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></Svg>; }

// ── Footer / trust + contact icons ──
export function IconTruck(props: IconProps) { return <Svg {...props}><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></Svg>; }
export function IconWallet(props: IconProps) { return <Svg {...props}><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H18v3" /><path d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5H19a1 1 0 0 0 1-1V9.5a1 1 0 0 0-1-1H4.5" /><circle cx="16" cy="13.5" r="1.1" fill="currentColor" stroke="none" /></Svg>; }
export function IconGift(props: IconProps) { return <Svg {...props}><path d="M4 11h16v9H4zM4 8h16v3H4zM12 8v12" /><path d="M12 8S10.5 4.5 8.5 5s-.5 3 3.5 3M12 8s1.5-3.5 3.5-3 .5 3-3.5 3" /></Svg>; }
export function IconSparkle(props: IconProps) { return <Svg {...props}><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4z" /><path d="M18.5 16.5l.7 2 .8-2 2-.7-2-.8" /></Svg>; }
export function IconPin(props: IconProps) { return <Svg {...props}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" /></Svg>; }
export function IconPhone(props: IconProps) { return <Svg {...props}><path d="M6 3h3l1.8 4.4-2 1.4a12 12 0 0 0 5 5l1.4-2L21 17v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 4.5 6.6 1.5 1.5 0 0 1 6 5z" /></Svg>; }
export function IconMail(props: IconProps) { return <Svg {...props}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></Svg>; }
export function IconClock(props: IconProps) { return <Svg {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></Svg>; }
export function IconWhatsApp(props: IconProps) { return <Svg {...props}><path d="M5 19l1-3.4A7.5 7.5 0 1 1 8.4 18z" /><path d="M9 9.2c0 3 2.2 5 4.7 5.3.6.1 1.3-.6 1.4-1.1.1-.4-.1-.6-.4-.8l-1.1-.6c-.3-.1-.5 0-.7.2l-.3.4c-.9-.4-1.6-1.1-2-2l.4-.3c.2-.2.3-.4.2-.7l-.5-1.1c-.2-.4-.5-.6-.9-.4-.5.2-1.1.8-1.1 1.4Z" /></Svg>; }
