import 'server-only';

type SendTelegramMessageInput = {
  text: string;
  chatId?: string;
};

type TelegramSendResult =
  | { ok: true; skipped: false }
  | { ok: false; skipped: true; reason: 'missing_env' }
  | { ok: false; skipped: false; status: number };

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram notification failed:', errorText);
      return { ok: false, skipped: false, status: response.status };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    console.error('Telegram notification request failed:', error);
    return { ok: false, skipped: false, status: 0 };
  } finally {
    clearTimeout(timeout);
  }
}
