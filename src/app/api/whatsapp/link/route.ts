import { NextResponse } from "next/server";
import { createWhatsAppVerification, setWhatsAppPhone } from "@/lib/data/repo";
import { getSessionUser } from "@/lib/auth/cookies";
import { normalizePhone } from "@/lib/notify/whatsapp";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.demo) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { phone?: string }
    | null;
  const raw = body?.phone?.trim();
  if (!raw) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }
  const phone = normalizePhone(raw);
  if (phone.length < 10) {
    return NextResponse.json(
      { error: "invalid phone" },
      { status: 400 },
    );
  }

  const code = await createWhatsAppVerification(user.id, phone);
  if (!code) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  await setWhatsAppPhone(user.id, null);

  return NextResponse.json({
    ok: true,
    phone,
    code,
    hint:
      "Envía desde ese número de WhatsApp el mensaje: verificar <código>",
  });
}