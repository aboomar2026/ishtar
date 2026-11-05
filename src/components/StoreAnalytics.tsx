'use client';
import Script from 'next/script';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ANALYTICS_CONSENT_KEY, ANALYTICS_READY_EVENT, ANALYTICS_PREFERENCES_EVENT, analyticsPageTitle, getAnalyticsWindow, safeAnalyticsUrl, validMeasurementId } from '@/lib/analytics';

export function AnalyticsPreferences() {
  return <button type="button" className="ghostButton" onClick={() => window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT))}>تغيير اختيار إحصاءات الزيارات</button>;
}
export function StoreAnalytics({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<string>();
  const [showChoice, setShowChoice] = useState(false);
  const lastPage = useRef('');
  useEffect(() => {
    try { const value = localStorage.getItem(ANALYTICS_CONSENT_KEY); setConsent(value ?? 'unknown'); setShowChoice(!value); }
    catch { setConsent('denied'); }
    const open = () => setShowChoice(true);
    window.addEventListener(ANALYTICS_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(ANALYTICS_PREFERENCES_EVENT, open);
  }, []);
  useEffect(() => {
    if (!validMeasurementId(measurementId) || consent !== 'granted') return;
    const target = getAnalyticsWindow();
    if (!target) return;
    (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = false;
    target.dataLayer ??= [];
    // Google's tag consumes the standard arguments-object queue.
    // eslint-disable-next-line prefer-rest-params
    target.gtag ??= function () { target.dataLayer!.push(arguments); };
    target.gtag('js', new Date());
    target.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    target.gtag('config', measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: safeAnalyticsUrl(window.location.href), page_referrer: document.referrer ? new URL(document.referrer).origin : '', page_title: analyticsPageTitle(window.location.pathname) });
    window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
    return () => { (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true; };
  }, [consent, measurementId]);
  useEffect(() => {
    if (!validMeasurementId(measurementId) || consent !== 'granted' || lastPage.current === pathname) return;
    const target = getAnalyticsWindow();
    if (!target?.gtag) return;
    lastPage.current = pathname;
    target.gtag('set', { page_location: safeAnalyticsUrl(window.location.href), page_title: analyticsPageTitle(pathname) });
    target.gtag('event', 'page_view', { page_location: safeAnalyticsUrl(window.location.href), page_title: analyticsPageTitle(pathname) });
  }, [pathname, consent, measurementId]);
  if (!validMeasurementId(measurementId)) return null;
  function choose(value: 'granted' | 'denied') {
    try { localStorage.setItem(ANALYTICS_CONSENT_KEY, value); } catch { setShowChoice(false); return; }
    // A reload reliably stops an already-loaded tag after revoking consent.
    if (consent === 'granted' && value === 'denied') { window.location.reload(); return; }
    setConsent(value); setShowChoice(false);
  }
  return <>
    {consent === 'granted' && <Script id="ishtar-google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />}
    {showChoice && <section className="analyticsConsent" role="region" aria-label="اختيار إحصاءات الزيارات">
      <p>نستخدم Google Analytics لفهم الزيارات وتحسين المتجر، بعد موافقتك. <Link href="/privacy">تفاصيل الخصوصية</Link></p>
      <div><button type="button" className="primaryButton" onClick={() => choose('granted')}>السماح بالإحصاءات</button><button type="button" className="ghostButton" onClick={() => choose('denied')}>بدون إحصاءات</button></div>
    </section>}
  </>;
}
