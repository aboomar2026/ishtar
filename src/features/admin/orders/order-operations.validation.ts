import { z } from 'zod';

const optionalNote = z.string().trim().max(2000).optional().transform((value) => (value ? value : undefined));

export const orderNotesSchema = z.object({
  internalNote: optionalNote,
  packagingNote: optionalNote,
  deliveryNote: optionalNote
});

export type OrderNotesInput = z.input<typeof orderNotesSchema>;

export const PRINT_TYPES = ['invoice', 'packing'] as const;
export type PrintType = (typeof PRINT_TYPES)[number];
