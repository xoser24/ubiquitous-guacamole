export type WhatsAppSendTextInput = {
  to: string; // E.164: +905xxxxxxxxx
  body: string;
  preview_url?: boolean;
};

export function getWhatsAppEnv() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_TOKEN veya WHATSAPP_PHONE_NUMBER_ID eksik.");
  }
  return { token, phoneNumberId };
}

export async function sendWhatsAppText(input: WhatsAppSendTextInput) {
  const { token, phoneNumberId } = getWhatsAppEnv();

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to.replace(/^\+/, ""), // API beklenen format: ülke kodu dahil, + olmadan
      type: "text",
      text: {
        body: input.body,
        preview_url: input.preview_url ?? false
      }
    })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (json?.error?.message as string | undefined) ??
      `WhatsApp API hata: HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as any;
}

