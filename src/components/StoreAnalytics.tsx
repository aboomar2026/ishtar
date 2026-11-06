'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ANALYTICS_READY_EVENT, COOKIELESS_CONSENT, analyticsPageTitle, getAnalyticsWindow, safeAnalyticsUrl, validMeasurementId } from '@/lib/analytics';

export function StoreAnalytics({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const [initializedId, setInitializedId] = useState<string>();
  const lastPage = useRef('');
  useEffect(() => {
    if (!validMeasurementId(measurementId)) return;
    const target = getAnalyticsWindow();
    if (!target) return;
    (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = false;
    target.dataLayer ??= [];
    // Google's tag consumes the standard arguments-object queue.
    // eslint-disable-next-line prefer-rest-params
    target.gtag ??= function () { target.dataLayer!.push(arguments); };
    // Queue denied storage before initialization or loading the Google tag.
    // No consent update to granted: this integration always stays cookieless.
    target.gtag('consent', 'default', COOKIELESS_CONSENT);
    target.gtag('set', 'ads_data_redaction', true);
    target.gtag('set', 'url_passthrough', false);
    target.gtag('js', new Date());
    target.gtag('config', measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: safeAnalyticsUrl(window.location.href), page_referrer: document.referrer ? new URL(document.referrer).origin : '', page_title: analyticsPageTitle(window.location.pathname) });
    setInitializedId(measurementId);
    window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
    return () => { (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true; };
  }, [measurementId]);
  useEffect(() => {
    if (!validMeasurementId(measurementId) || initializedId !== measurementId || lastPage.current === pathname) return;
    const target = getAnalyticsWindow();
    if (!target?.gtag) return;
    lastPage.current = pathname;
    target.gtag('set', { page_location: safeAnalyticsUrl(window.location.href), page_title: analyticsPageTitle(pathname) });
    target.gtag('event', 'page_view', { page_location: safeAnalyticsUrl(window.location.href), page_title: analyticsPageTitle(pathname) });
  }, [pathname, initializedId, measurementId]);
  if (!validMeasurementId(measurementId) || initializedId !== measurementId) return null;
  return <Script id="ishtar-google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />;
}
