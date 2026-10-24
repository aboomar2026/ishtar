'use client';
import { IconX } from './Icons';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { trackOrderSchema } from '@/features/orders/order.validation';
import { trackOrderAction } from '@/features/orders/order.actions';
import {
  clearRecentOrders,
  getRecentOrders,
  removeRecentOrder,
  type RecentOrder
} from '@/features/orders/recent-orders.client';
import type { OrderView } from '@/features/orders/order.types';
import { ORDER_STATUS_LABEL_AR, ORDER_TRACKING_STEPS_AR } from '@/features/orders/order-status.labels';

const RECENT_STATUS_AUTO_LIMIT = 5;

type RecentStatusLookup = {
  status?: OrderView['status'];
  total?: number;
  deliveryFeeStatus?: OrderView['deliveryFeeStatus'];
  fetchedAt?: string;
  error?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير معروف';
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeZone: 'Asia/Hebron' }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Hebron' }).format(date);
}

function orderLocation(order: RecentOrder) {
  return [order.city, order.area].filter(Boolean).join(' · ');
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function TrackOrderForm({ initialOrderNumber = '' }: { initialOrderNumber?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const manualFormRef = useRef<HTMLFormElement>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [recentLookup, setRecentLookup] = useState<Record<string, RecentStatusLookup>>({});
  const [refreshingRecent, setRefreshingRecent] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState<string | null>(null);
  const [confirmClearRecent, setConfirmClearRecent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderView | null>(null);
  const autoRefreshedRef = useRef(false);

  useEffect(() => {
    setRecentOrders(getRecentOrders());
    setRecentLoaded(true);
  }, []);

  const refreshRecentStatuses = useCallback(async (ordersToRefresh: RecentOrder[], markPanelLoading = false) => {
    if (ordersToRefresh.length === 0) return;
    if (markPanelLoading) setRefreshingRecent(true);

    for (const savedOrder of ordersToRefresh) {
      try {
        const result = await trackOrderAction({ orderNumber: savedOrder.orderNumber, phone: savedOrder.phone });
        setRecentLookup((current) => ({
          ...current,
          [savedOrder.orderNumber]: result.ok
            ? {
                status: result.order.status,
                total: result.order.total,
                deliveryFeeStatus: result.order.deliveryFeeStatus,
                fetchedAt: new Date().toISOString()
              }
            : {
                error: result.error,
                fetchedAt: new Date().toISOString()
              }
        }));
      } catch {
        setRecentLookup((current) => ({
          ...current,
          [savedOrder.orderNumber]: {
            error: 'تعذر تحديث حالة هذا الطلب حالياً.',
            fetchedAt: new Date().toISOString()
          }
        }));
      }
    }

    if (markPanelLoading) setRefreshingRecent(false);
  }, []);

  useEffect(() => {
    if (!recentLoaded || autoRefreshedRef.current || recentOrders.length === 0) return;
    autoRefreshedRef.current = true;
    void refreshRecentStatuses(recentOrders.slice(0, RECENT_STATUS_AUTO_LIMIT));
  }, [recentLoaded, recentOrders, refreshRecentStatuses]);

  async function runTracking(nextOrderNumber: string, nextPhone: string, loadingLabel: string) {
    if (loadingKey) return;
    setLoadingKey(loadingLabel);
    setError(null);
    setOrder(null);

    try {
      const result = await trackOrderAction({ orderNumber: nextOrderNumber, phone: nextPhone });

      if (result.ok) {
        setOrder(result.order);
        setRecentLookup((current) => ({
          ...current,
          [result.order.orderNumber]: {
            status: result.order.status,
            total: result.order.total,
            deliveryFeeStatus: result.order.deliveryFeeStatus,
            fetchedAt: new Date().toISOString()
          }
        }));
        window.requestAnimationFrame(() => {
          document.getElementById('track-order-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        setError(result.error);
      }
    } catch {
      setError('تعذر تتبع الطلب حالياً، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoadingKey(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = trackOrderSchema.safeParse({ orderNumber, phone });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      requestAnimationFrame(() => manualFormRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setFieldErrors({});
    await runTracking(parsed.data.orderNumber, parsed.data.phone, 'manual');
  }

  function trackSavedOrder(savedOrder: RecentOrder) {
    setOrderNumber(savedOrder.orderNumber);
    setPhone(savedOrder.phone);
    void runTracking(savedOrder.orderNumber, savedOrder.phone, savedOrder.orderNumber);
  }

  function hideSavedOrder(savedOrder: RecentOrder) {
    setConfirmClearRecent(false);
    setRecentOrders(removeRecentOrder(savedOrder.orderNumber));
    setRecentLookup((current) => {
      const next = { ...current };
      delete next[savedOrder.orderNumber];
      return next;
    });
    if (order?.orderNumber === savedOrder.orderNumber) {
      setOrder(null);
    }
  }

  function hideAllSavedOrders() {
    if (!confirmClearRecent) {
      setConfirmClearRecent(true);
      return;
    }

    clearRecentOrders();
    setRecentOrders([]);
    setRecentLookup({});
    setOrder(null);
    setConfirmClearRecent(false);
  }

  async function copyOrderNumber(value: string) {
    try {
      await copyTextToClipboard(value);
      setCopiedOrderNumber(value);
      window.setTimeout(() => setCopiedOrderNumber((current) => (current === value ? null : current)), 1800);
    } catch {
      setCopiedOrderNumber(null);
    }
  }

  const activeIndex = order ? ORDER_TRACKING_STEPS_AR.findIndex((step) => step.key === order.status) : -1;
  const isCanceled = order?.status === 'CANCELED';
  const canRefreshRecent = recentLoaded && recentOrders.length > 0 && !refreshingRecent;

  return (
    <div className={`trackOrderWrap${recentLoaded && !recentOrders.length ? " noRecentOrders" : ""}`}>
      <section className="formCard recentOrdersPanel" aria-labelledby="recent-orders-title">
        <div className="recentOrdersHeader">
          <div>
            <span className="eyebrow">Local orders</span>
            <h2 id="recent-orders-title">طلباتك على هذا الجهاز</h2>
          </div>
          {recentOrders.length > 0 && <span className="recentOrdersCount">{recentOrders.length} محفوظة</span>}
        </div>
        <p className="checkoutTrustText">
          نعرض هنا الطلبات التي تم إنشاؤها من هذا المتصفح فقط. يمكنك إخفاء أي طلب من القائمة، وهذا لا يلغي الطلب من المتجر.
        </p>
        {confirmClearRecent && (
          <div className="recentOrdersConfirmNote" role="status">
            سيتم إخفاء كل الطلبات من هذا الجهاز فقط. الطلبات الحقيقية ستبقى محفوظة في المتجر.
          </div>
        )}

        {recentOrders.length > 0 && (
          <div className="recentOrdersToolbar" aria-label="إدارة الطلبات المحفوظة">
            <button
              type="button"
              className="ghostButton fullWidth"
              onClick={() => void refreshRecentStatuses(recentOrders, true)}
              disabled={!canRefreshRecent}
            >
              {refreshingRecent ? 'جاري تحديث الحالات...' : 'تحديث الحالات'}
            </button>
            <div className="recentOrdersClearGroup">
              <button type="button" className="recentOrderDangerButton fullWidth" onClick={hideAllSavedOrders}>
                {confirmClearRecent ? 'تأكيد إخفاء الكل' : 'إخفاء الكل'}
              </button>
              {confirmClearRecent && (
                <button type="button" className="ghostButton fullWidth" onClick={() => setConfirmClearRecent(false)}>
                  تراجع
                </button>
              )}
            </div>
          </div>
        )}

        {!recentLoaded ? (
          <div className="recentOrdersEmpty">جاري قراءة الطلبات المحفوظة...</div>
        ) : recentOrders.length === 0 ? (
          <div className="recentOrdersEmpty">لا توجد طلبات محفوظة على هذا الجهاز بعد.</div>
        ) : (
          <div className="recentOrdersList">
            {recentOrders.map((savedOrder) => {
              const location = orderLocation(savedOrder);
              const isTracking = loadingKey === savedOrder.orderNumber;
              const lookup = recentLookup[savedOrder.orderNumber];
              const displayTotal = lookup?.total ?? savedOrder.total;
              const displayDeliveryFeeStatus = lookup?.deliveryFeeStatus ?? savedOrder.deliveryFeeStatus;
              return (
                <article className="recentOrderCard" key={savedOrder.orderNumber}>
                  <button
                    type="button"
                    className="recentOrderHide"
                    onClick={() => hideSavedOrder(savedOrder)}
                    aria-label={`إخفاء الطلب ${savedOrder.orderNumber} من هذا الجهاز`}
                  >
                    <IconX size={20} />
                  </button>
                  <div className="recentOrderMain">
                    <span className="recentOrderLabel">رقم الطلب</span>
                    <strong>{savedOrder.orderNumber}</strong>
                    <small>{formatDate(savedOrder.createdAt)}</small>
                    {lookup?.status && (
                      <span className={`orderStatusBadge recentOrderStatus status-${lookup.status}`}>
                        {ORDER_STATUS_LABEL_AR[lookup.status]}
                      </span>
                    )}
                    {lookup?.error && <small className="recentOrderLookupError">{lookup.error}</small>}
                  </div>
                  <div className="recentOrderMeta">
                    {savedOrder.customerName && <span>{savedOrder.customerName}</span>}
                    {location && <span>{location}</span>}
                    {typeof displayTotal === 'number' && <span>{displayDeliveryFeeStatus === 'PENDING' ? 'قبل التوصيل' : 'الإجمالي'}: ₪{displayTotal}</span>}
                    {lookup?.fetchedAt && <span>آخر تحديث: {formatDateTime(lookup.fetchedAt)}</span>}
                  </div>
                  <div className="recentOrderActions">
                    <button
                      type="button"
                      className="primaryButton fullWidth"
                      onClick={() => trackSavedOrder(savedOrder)}
                      disabled={Boolean(loadingKey)}
                    >
                      {isTracking ? 'جاري التتبع...' : 'تتبع الطلب'}
                    </button>
                    <button type="button" className="ghostButton fullWidth" onClick={() => void copyOrderNumber(savedOrder.orderNumber)}>
                      {copiedOrderNumber === savedOrder.orderNumber ? 'تم النسخ' : 'نسخ الرقم'}
                    </button>
                    <button type="button" className="ghostButton fullWidth" onClick={() => hideSavedOrder(savedOrder)}>
                      إخفاء
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <form className="formCard manualTrackForm" ref={manualFormRef} onSubmit={onSubmit} noValidate>
        <span className="eyebrow">Manual tracking</span>
        <h2>{recentOrders.length ? "تتبع طلبًا آخر" : "تتبع طلبك"}</h2>
        <p className="checkoutTrustText">أدخلي رقم الطلب ورقم الجوال المستخدم عند الطلب.</p>
        <div className="formGrid">
          <label>
            رقم الطلب
            <input aria-invalid={Boolean(fieldErrors.orderNumber)} aria-describedby={fieldErrors.orderNumber ? "tracking-number-error" : undefined} dir="ltr" autoComplete="off" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required placeholder="رقم الطلب من تأكيد الشراء" />
            {fieldErrors.orderNumber && <small className="fieldError" id="tracking-number-error">{fieldErrors.orderNumber}</small>}
          </label>
          <label>
            رقم الجوال
            <input aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "tracking-phone-error" : undefined} type="tel" dir="ltr" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="05xxxxxxxx" />
            {fieldErrors.phone && <small className="fieldError" id="tracking-phone-error">{fieldErrors.phone}</small>}
          </label>
        </div>
        {error && <div className="stockNotice" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        <button type="submit" className="primaryButton fullWidth" disabled={Boolean(loadingKey)} style={{ marginTop: 14 }}>
          {loadingKey === 'manual' ? 'جاري البحث...' : 'تتبع الطلب'}
        </button>
      </form>

      {order && (
        <div className="formCard trackOrderResult" id="track-order-result">
          <div className="orderBadgeRow">
            <span className="orderNumberPill">رقم الطلب: <strong>{order.orderNumber}</strong></span>
            <span className={`orderStatusBadge status-${order.status}`}>{ORDER_STATUS_LABEL_AR[order.status]}</span>
            <button type="button" className="orderCopyButton" onClick={() => void copyOrderNumber(order.orderNumber)}>
              {copiedOrderNumber === order.orderNumber ? 'تم نسخ الرقم' : 'نسخ رقم الطلب'}
            </button>
          </div>

          {isCanceled ? (
            <div className="stockNotice" style={{ marginTop: 12 }}>تم إلغاء هذا الطلب.</div>
          ) : (
            <ol className="orderTimeline">
              {ORDER_TRACKING_STEPS_AR.map((step, index) => (
                <li key={step.key} className={index <= activeIndex ? 'done' : ''}>
                  <span className="orderTimelineDot" />
                  {step.label}
                </li>
              ))}
            </ol>
          )}

          <div className="summaryDivider" />
          {order.items.map((item) => (
            <div className="miniOrderItem" key={item.id}>
              <img src={item.image ?? '/mock-products/gift-box.svg'} alt={item.productName} />
              <div>
                <strong>{item.productName}</strong>
                <span>
                  × {item.quantity}
                  {item.colorName ? ` · ${item.colorName}` : ''}
                  {item.size ? ` · ${item.size}` : ''}
                </span>
              </div>
              <b>₪{item.total}</b>
            </div>
          ))}
          <div className="summaryLine"><span>التوصيل</span><strong>{order.deliveryFeeStatus === 'PENDING' ? 'يحدد عند التأكيد' : order.deliveryFeeStatus === 'FREE' ? 'مجاني' : `₪${order.deliveryFee}`}</strong></div>
          <div className="summaryTotal"><span>{order.deliveryFeeStatus === 'PENDING' ? 'الإجمالي قبل التوصيل' : 'الإجمالي (كاش عند الاستلام)'}</span><strong>₪{order.total}</strong></div>
        </div>
      )}
    </div>
  );
}
