import { z } from 'zod';

/** Normalise a phone number: keep a leading + and digits only. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

const lineSchema = z.object({
  variantId: z.string().trim().min(1),
  quantity: z.coerce.number().int('الكمية يجب أن تكون رقماً صحيحاً').min(1, 'الكمية يجب أن تكون 1 على الأقل').max(999)
});

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, 'الاسم الكامل مطلوب').max(120),
  phone: z
    .string()
    .trim()
    .min(6, 'رقم الجوال مطلوب')
    .transform(normalizePhone)
    .refine((value) => value.replace(/\D/g, '').length >= 7, 'رقم الجوال غير صالح'),
  whatsappPhone: z
    .string()
    .trim()
    .max(40, 'رقم واتساب طويل جداً')
    .optional()
    .transform((value) => (value ? normalizePhone(value) : undefined))
    .refine((value) => !value || value.replace(/\D/g, '').length >= 7, 'رقم واتساب غير صالح'),
  city: z.string().trim().min(1, 'المحافظة مطلوبة').max(80),
  area: z.string().trim().min(1, 'المنطقة / الحي مطلوب').max(120),
  address: z.string().trim().min(5, 'العنوان التفصيلي مطلوب').max(500),
  notes: z.string().trim().max(1000).optional().transform((value) => value || undefined),
  lines: z.array(lineSchema).min(1, 'السلة فارغة')
});

export type CheckoutParsed = z.output<typeof checkoutSchema>;

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(3, 'رقم الطلب مطلوب').max(40),
  phone: z.string().trim().min(6, 'رقم الجوال مطلوب').transform(normalizePhone)
});

export type TrackOrderParsed = z.output<typeof trackOrderSchema>;
