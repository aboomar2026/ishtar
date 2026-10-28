import { brand } from '@/lib/brand';
import { whatsappHref, type WhatsAppContext } from '@/lib/whatsapp';
import { IconWhatsApp } from './Icons';

export function WhatsAppContact({ context, className = '', label = 'تواصلي معنا عبر واتساب' }: {
  context?: WhatsAppContext;
  className?: string;
  label?: string;
}) {
  const href = whatsappHref(brand.contact.whatsappNumber, context);
  if (!href) return null;
  return (
    <a className={`ghostButton whatsappContact ${className}`} href={href} target="_blank" rel="noopener noreferrer"
      aria-label={`${label} (يفتح في تبويب جديد)`}>
      <IconWhatsApp size={22} />
      <span>{label}</span>
    </a>
  );
}
