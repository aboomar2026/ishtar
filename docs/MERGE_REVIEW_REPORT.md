# Merge Review Report — Ready for Local QA

## المصدر
تمت مراجعة النسخة المرفوعة من المستخدم ومقارنتها مع آخر نسخة عمل مكتملة: `admin-final-stop-whatsapp-dashboard`.

## نتيجة الدمج
النسخة الجاهزة للاختبار مبنية على آخر نسخة مكتملة، مع الحفاظ على ملف `.env.example` من النسخة المرفوعة لأنه يحتوي placeholders مفيدة للتشغيل المحلي.

## تغييرات مدمجة في النسخة الجاهزة
- Variant Builder / Matrix في ProductForm.
- حماية Hydration في CartProvider.
- حفظ وتتبع الطلبات المحلية من نفس الجهاز.
- تحسين صفحة track-order.
- إصلاح soldCount وتدقيقه.
- تقوية خصم المخزون وسجل InventoryLog.
- DeliveryFeeStatus: PENDING / SET / FREE.
- تحديد التوصيل من الأدمن ومنع الشحن قبل تحديده.
- تقليل بيانات صفحة order-success لحماية الخصوصية.
- تحسين QuantitySelector للكتابة من الكيبورد.
- تحسين order admin flow والفاتورة وقائمة التجهيز.
- Dashboard يومي للأدمن.
- حقل واتساب اختياري في checkout، ويظهر في الأدمن والطباعة والتصدير.
- سكربتات backfill و audit.

## الملفات الحساسة المستبعدة من النسخة المضغوطة
- `.env`
- `.git`
- `.next`
- `node_modules`
- `tsconfig.tsbuildinfo`
- إعدادات Claude المحلية

## نتيجة الفحص داخل الساندبوكس
- `npm ci --ignore-scripts`: نجح.
- `npm run lint`: نجح.
- `npm run db:generate`: لم ينجح بسبب عدم قدرة الساندبوكس على الوصول إلى `binaries.prisma.sh`.
- `npm run typecheck`: غير قابل للحكم قبل نجاح `prisma generate` لأن Prisma Client غير مولّد.

## أوامر التشغيل المحلية المطلوبة
```bash
npm install
npm run db:generate
npm run db:push
npm run db:backfill-delivery-fee-status
npm run db:backfill-inventory-ledger
npm run db:backfill-sold-count
npm run db:audit-commerce
npm run typecheck
npm run lint
npm run build
npm run dev
```

## ملاحظات قبل الدمج
لا تعتمد على نتيجة typecheck داخل الساندبوكس. احكم من جهازك بعد `db:generate` و `db:push` أو migration.

إذا كنت ستستخدم migrations بدل `db:push`:

```bash
npm run db:migrate -- --name final_admin_delivery_whatsapp_inventory
```

ثم شغّل باقي أوامر backfill و audit.
