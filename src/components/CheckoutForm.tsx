'use client';

import { brandStorageKeys } from '@/lib/brand-storage';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CartSummary } from './CartSummary';
import { EmptyState } from './EmptyState';
import { useCart } from './CartProvider';
import { createCodOrderAction, recoverCheckoutAction } from '@/features/orders/order.actions';
import { saveRecentOrder } from '@/features/orders/recent-orders.client';
import type { OrderStockError } from '@/features/orders/order.types';

const governorates = ['غزة', 'شمال غزة', 'دير البلح', 'خانيونس', 'رفح', 'الضفة الغربية', 'القدس'];
const SHIPPING_KEY = brandStorageKeys.shipping;

type ShippingFields = { name: string; phone: string; whatsappPhone: string; city: string; area: string; address: string; notes: string };

const EMPTY_FIELDS: ShippingFields = { name: '', phone: '', whatsappPhone: '', city: '', area: '', address: '', notes: '' };

export function CheckoutForm() {
  const router = useRouter();
  const { lines, subtotal, deliveryFee, total, clearCart, isCartLoaded, refreshing, cartError, refreshCart } = useCart();

  const errorRef = useRef<HTMLDivElement>(null);
  const attemptRef = useRef<{ key: string } | null>(null);
  const [fields, setFields] = useState<ShippingFields>(EMPTY_FIELDS);
  const [submitting, setSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [recoveredOrder, setRecoveredOrder] = useState<{ orderNumber: string } | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stockErrors, setStockErrors] = useState<OrderStockError[]>([]);

  // Pre-fill shipping details from a previous order.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SHIPPING_KEY);
      if (stored) setFields({ ...EMPTY_FIELDS, ...JSON.parse(stored) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function recover() {
      try {
        const saved = sessionStorage.getItem(`${SHIPPING_KEY}:attempt`);
        if (!saved) return;
        const attempt: { key?: string } = JSON.parse(saved);
        if (typeof attempt.key !== 'string') return;
        attemptRef.current = { key: attempt.key };
        const receipt = await recoverCheckoutAction(attempt.key);
        if (receipt && active) {
          // A committed receipt may belong to an older cart. Never discard today's cart.
          setRecoveredOrder(receipt);
          setUncertain(true);
        }
      } catch { if (active) setUncertain(true); }
      finally { if (active) setRecovering(false); }
    }
    void recover();
    return () => { active = false; };
  }, []);

  async function checkPreviousAttempt() {
    if (!attemptRef.current) { setUncertain(false); return; }
    setSubmitting(true);
    try {
      const receipt = await recoverCheckoutAction(attemptRef.current.key);
      if (receipt) {
        setRecoveredOrder(receipt);
        setUncertain(true);
      } else {
        // Retain the key: an in-flight transaction can still finish after this lookup.
        setUncertain(false); setError('لم تظهر نتيجة محفوظة بعد. أعيدي المحاولة بنفس البيانات؛ سنستخدم معرّف المحاولة نفسه.');
      }
    } catch { setError('تعذر التحقق من نتيجة المحاولة. تحققي من الاتصال وأعيدي التحقق.'); }
    finally { setSubmitting(false); }
  }

  function continueWithNewCart() {
    // Only a confirmed committed receipt allows retiring the previous attempt.
    if (!recoveredOrder) return;
    try { sessionStorage.removeItem(`${SHIPPING_KEY}:attempt`); } catch { /* optional */ }
    attemptRef.current = null;
    setRecoveredOrder(null);
    setUncertain(false);
    setError(null);
  }

  function set<K extends keyof ShippingFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    setStockErrors([]);

    try {

    const payload = {
      fullName: fields.name,
      phone: fields.phone,
      whatsappPhone: fields.whatsappPhone || undefined,
      city: fields.city,
      area: fields.area,
      address: fields.address,
      notes: fields.notes || undefined,
      lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })).sort((a, b) => a.variantId.localeCompare(b.variantId))
    };
    if (!attemptRef.current) attemptRef.current = { key: crypto.randomUUID() };
    try { sessionStorage.setItem(`${SHIPPING_KEY}:attempt`, JSON.stringify(attemptRef.current)); } catch { /* The key still survives a retry during this mount. */ }
    const result = await createCodOrderAction({ ...payload, requestKey: attemptRef.current.key });

    if (result.ok) {
      try {
        window.localStorage.setItem(SHIPPING_KEY, JSON.stringify(fields));
      } catch {
        /* ignore */
      }
      saveRecentOrder({
        orderNumber: result.orderNumber,
        phone: fields.phone,
        customerName: fields.name,
        city: fields.city,
        area: fields.area,
        total: result.total,
        deliveryFeeStatus: 'PENDING',
        createdAt: new Date().toISOString()
      });
      try { sessionStorage.removeItem(`${SHIPPING_KEY}:attempt`); } catch { /* optional */ }
      attemptRef.current = null;
      clearCart();
      router.push(`/order-success?order=${encodeURIComponent(result.orderNumber)}`);
      return;
    }

    // Only validation and stock rejection establish that this attempt did not commit.
    if (result.fieldErrors || result.stockErrors) {
      try { sessionStorage.removeItem(`${SHIPPING_KEY}:attempt`); } catch { /* optional */ }
      attemptRef.current = null;
    } else { setUncertain(true); }
    setError(result.error);
    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    if (result.stockErrors) setStockErrors(result.stockErrors);
        } catch {
      setUncertain(true);
      setError('تعذر استلام نتيجة الطلب. أعيدي المحاولة بنفس البيانات؛ نحافظ على معرّف المحاولة لمنع تكراره.');
    } finally { setSubmitting(false); }

  }

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  if (!isCartLoaded || recovering) return <p role="status">جاري استعادة السلة...</p>;
  if (uncertain) {
    return (
      <section className="formCard" role="status">
        {recoveredOrder ? (
          <>
            <h2>وجدنا طلباً سابقاً مسجّلاً</h2>
            <p>رقم الطلب السابق: <bdi>{recoveredOrder.orderNumber}</bdi>. لم نرسل السلة الحالية كطلب جديد، ولم نحذف منتجاتها.</p>
            <div className="heroActions">
              <Link className="ghostButton" href={`/order-success?order=${encodeURIComponent(recoveredOrder.orderNumber)}`}>عرض الطلب السابق</Link>
              <button className="primaryButton" type="button" onClick={continueWithNewCart}>متابعة طلب جديد بالسلة الحالية</button>
            </div>
          </>
        ) : (
          <>
            <p>نتيجة المحاولة السابقة غير مؤكدة. تحققي منها قبل محاولة جديدة.</p>
            <button className="primaryButton" type="button" onClick={() => void checkPreviousAttempt()} disabled={submitting}>التحقق من نتيجة المحاولة</button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
    );
  }
  if (!lines.length) {
    return <EmptyState title="لا يوجد طلب لإتمامه" description="أضيفي منتجات للسلة ثم ارجعي للدفع عند الاستلام." actionHref="/" actionLabel="تصفّح المنتجات" />;
  }

  return (
    <div className="checkoutLayout">
      {cartError && <div className="checkoutCartError" role="alert">{cartError} <button type="button" onClick={() => void refreshCart()}>إعادة المحاولة</button></div>}
      <form className="checkoutForm" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        {error && (
          <div className="stockNotice" role="alert" tabIndex={-1} ref={errorRef}>
            {error}
            {stockErrors.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingInlineStart: 18 }}>
                {stockErrors.map((item) => (
                  <li key={item.variantId}>
                    {item.productName} — {item.available > 0 ? `المتاح: ${item.available}` : 'غير متوفر حالياً'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <section className="formCard">
          <span className="eyebrow">Cash on delivery</span>
          <h2>معلومات التوصيل</h2>
          <p className="fieldHint">أدخلي بيانات التواصل وعنوان التسليم. جميع الحقول مطلوبة ما لم يُذكر أنها اختيارية.</p>
          <div className="formGrid">
            <label>
              الاسم الكامل
              <input name="name" autoComplete="name" aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? "checkout-fullName-error" : undefined} value={fields.name} onChange={(e) => set('name', e.target.value)} required placeholder="مثال: سارة أحمد" />
              {fieldErrors.fullName && <small id="checkout-fullName-error" className="fieldError">{fieldErrors.fullName}</small>}
            </label>
            <label>
              رقم الجوال
              <input name="phone" autoComplete="tel" type="tel" dir="ltr" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "checkout-phone-error" : undefined} value={fields.phone} onChange={(e) => set('phone', e.target.value)} required inputMode="tel" placeholder="05xxxxxxxx" />
              {fieldErrors.phone && <small id="checkout-phone-error" className="fieldError">{fieldErrors.phone}</small>}
            </label>
            <label className="spanTwo">
              رقم واتساب (اختياري)
              <input name="whatsappPhone" type="tel" dir="ltr" aria-invalid={Boolean(fieldErrors.whatsappPhone)} aria-describedby={fieldErrors.whatsappPhone ? "checkout-whatsapp-hint checkout-whatsappPhone-error" : "checkout-whatsapp-hint"} value={fields.whatsappPhone} onChange={(e) => set('whatsappPhone', e.target.value)} inputMode="tel" placeholder="اتركيه فارغاً إذا نفس رقم الجوال" />
              <small id="checkout-whatsapp-hint" className="fieldHint">استخدميه إذا كان رقم واتساب مختلفاً عن رقم الاتصال.</small>
              {fieldErrors.whatsappPhone && <small id="checkout-whatsappPhone-error" className="fieldError">{fieldErrors.whatsappPhone}</small>}
            </label>
            <label className="spanTwo">
              المحافظة
              <select name="city" autoComplete="address-level1" aria-invalid={Boolean(fieldErrors.city)} aria-describedby={fieldErrors.city ? "checkout-city-error" : undefined} value={fields.city} onChange={(e) => set('city', e.target.value)} required>
                <option value="" disabled>اختاري المحافظة</option>
                {governorates.map((city) => <option value={city} key={city}>{city}</option>)}
              </select>
              {fieldErrors.city && <small id="checkout-city-error" className="fieldError">{fieldErrors.city}</small>}
            </label>
            <label className="spanTwo">
              المنطقة / الحي
              <input name="area" autoComplete="address-level2" aria-invalid={Boolean(fieldErrors.area)} aria-describedby={fieldErrors.area ? "checkout-area-error" : undefined} value={fields.area} onChange={(e) => set('area', e.target.value)} required placeholder="اسم المنطقة" />
              {fieldErrors.area && <small id="checkout-area-error" className="fieldError">{fieldErrors.area}</small>}
            </label>
            <label className="spanTwo">
              العنوان التفصيلي
              <textarea name="address" autoComplete="street-address" aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? "checkout-address-error" : undefined} value={fields.address} onChange={(e) => set('address', e.target.value)} required placeholder="شارع، علامة مميزة، قرب..." />
              {fieldErrors.address && <small id="checkout-address-error" className="fieldError">{fieldErrors.address}</small>}
            </label>
            <label className="spanTwo">
              ملاحظات اختيارية
              <textarea name="notes" value={fields.notes} onChange={(e) => set('notes', e.target.value)} placeholder="وقت مناسب للتواصل، لون بديل، ملاحظات للهدية..." />
            </label>
          </div>
        </section>

        <section className="formCard paymentCard">
          <h2>طريقة الدفع</h2>
          <label className="radioCard">
            <input type="radio" name="payment" checked readOnly />
            <span>
              <strong>كاش عند الاستلام</strong>
              <small>سنتواصل معك لتأكيد الطلب والتوصيل قبل التجهيز.</small>
            </span>
          </label>
        </section>

        <button type="submit" className="primaryButton fullWidth checkoutSubmit" disabled={submitting || refreshing || Boolean(cartError) || lines.some((line) => line.maxQuantity === 0)}>
          {submitting ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب'}
        </button>
      </form>

      <aside className="checkoutSide">
        <div className="miniOrderList">
          <h2>منتجاتك</h2><Link href="/cart">تعديل السلة والكميات</Link>
          {lines.map((line) => (
            <div className="miniOrderItem" key={line.variantId}>
              <img src={line.image} alt={line.name} />
              <div>
                <strong>{line.name}</strong>
                <span>
                  × {line.quantity}
                  {line.selectedColorName ? ` · ${line.selectedColorName}` : ''}
                  {line.selectedSize ? ` · ${line.selectedSize}` : ''}
                </span>
              </div>
              <b>₪{line.unitPrice * line.quantity}</b>
            </div>
          ))}
        </div>
        <CartSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} checkout={false} />

      </aside>
    </div>
  );
}
