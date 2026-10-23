import 'server-only';

type SendTelegramMessageInput = {
  text: string;
  chatId?: string;
};

export type TelegramSendResult =
  | { ok: true; skipped: false; messageId?: number }
  | { ok: false; skipped: true; reason: 'missing_env' }
  | { ok: false; skipped: false; status: number; code: 'REJECTED' | 'RETRYABLE' | 'UNCERTAIN' | 'CHAT_MIGRATED' | 'ORDER_MISSING'; retryAfter?: number };

const TELEGRAM_SEND_TIMEOUT_MS = 5_000;

export async function sendTelegramMessage({ text, chatId }: SendTelegramMessageInput): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId ?? process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !targetChatId) {
    console.warn('Telegram notification skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID');
    return { ok: false, skipped: true, reason: 'missing_env' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_SEND_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });

    const body = await response.json().catch(() => null) as {
      ok?: boolean; error_code?: number; result?: { message_id?: number };
      parameters?: { retry_after?: number; migrate_to_chat_id?: number };
    } | null;
    if (response.ok && body?.ok === true && Number.isInteger(body.result?.message_id)) {
      return { ok: true, skipped: false, messageId: body.result?.message_id };
    }
    // Log safe codes only: raw responses/errors can contain order data or bot URLs.
    if (body?.ok !== false) return { ok: false, skipped: false, status: response.status, code: 'UNCERTAIN' };
    const status = Number.isInteger(body.error_code) ? body.error_code! : response.status;
    if (body.parameters?.migrate_to_chat_id) return { ok: false, skipped: false, status, code: 'CHAT_MIGRATED' };
    const retryAfter = body.parameters?.retry_after;
    // Never silently shorten a provider's requested delay. Unusable/extreme delays need review.
    if (retryAfter !== undefined && (!Number.isInteger(retryAfter) || retryAfter < 0 || retryAfter > 604800)) {
      return { ok: false, skipped: false, status, code: 'REJECTED' };
    }
    return { ok: false, skipped: false, status, code: status === 429 || status >= 500 ? 'RETRYABLE' : 'REJECTED', retryAfter };
  } catch {
    // A timeout can happen after Telegram accepted the message. Never claim a definite failure.
    return { ok: false, skipped: false, status: 0, code: 'UNCERTAIN' };
  } finally {
    clearTimeout(timeout);
  }
}
