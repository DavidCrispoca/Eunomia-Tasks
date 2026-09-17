import "server-only";

const GRAPH_VERSION = "v21.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID,
  );
}

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${GRAPH_VERSION}${path}`;
}

/** Envía un mensaje de texto al número indicado (formato intl, sin '+'). */
export async function sendMessage(to: string, body: string): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;
  try {
    const res = await fetch(
      graphUrl(`/${process.env.WHATSAPP_PHONE_ID}/messages`),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body },
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[whatsapp] error enviando mensaje:", res.status, detail);
    }
    return res.ok;
  } catch (err) {
    console.error("[whatsapp] error de red:", err);
    return false;
  }
}

/** Normaliza un teléfono a solo dígitos (A1B2C3 -> 123). */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}