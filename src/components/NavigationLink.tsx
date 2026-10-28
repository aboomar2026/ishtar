'use client';

import Link from 'next/link';
import { forwardRef, type ComponentProps } from 'react';
import { useNavigation } from './NavigationProvider';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };
const NavigationLink = forwardRef<HTMLAnchorElement, Props>(function NavigationLink({ onNavigate, href, replace, scroll, ...props }, ref) {
  const navigation = useNavigation();
  return <Link {...props} ref={ref} href={href} replace={replace} scroll={scroll} data-navigation-managed="true" onNavigate={event => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (prevented || !navigation) return;
    // Next calls onNavigate only for eligible client navigations, preserving
    // modified clicks, targets, downloads, external links and onClick guards.
    event.preventDefault();
    (replace ? navigation.replace : navigation.push)(href, { scroll });
  }} />;
});
export default NavigationLink;
