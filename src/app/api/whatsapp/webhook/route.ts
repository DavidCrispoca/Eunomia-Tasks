import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  addTaskForUser,
  completeTaskById,
  getUserByPhone,
  listPendingTasks,
  resolveWhatsAppCode,
} from "@/lib/data/repo";
import { parseCommand } from "@/lib/whatsapp/commands";
import { normalizePhone, sendMessage } from "@/lib/notify/whatsapp";

const HELP_TEXT = [
  "Comandos de Eunomia:",
  "• añadir <título> — crea una tarea",
  "• completar <n> — completa la tarea n de tu lista",
  "• listar — muestra tus pendientes numerados",
  "• verificar <código> — vincula este número a tu cuenta",
  "• ayuda — esta lista",
].join("\n");

function verifySignature(rawBody: string, header: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true; // sin secret configurado no podemos verificar
  if (!header) return false;
  const expectedHex = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expected = Buffer.from(`sha256=${expectedHex}`);
  const received = Buffer.from(header);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

async function formatPendingList(userId: string): Promise<string> {
  const pending = await listPendingTasks(userId);
  if (pending.length === 0) {
    return "No tienes tareas pendientes 🎉";
  }
  return [
    `Tienes ${pending.length} ${pending.length === 1 ? "tarea pendiente" : "tareas pendientes"}:`,
    ...pending.map((t, i) => {
      const due = t.due_date
        ? ` · para el ${t.due_date}`
        : "";
      return `${i + 1}. ${t.title}${due}`;
    }),
    "",
    "Envía «completar <n>» para marcar una como hecha.",
  ].join("\n");
}

async function handleInbound(from: string, text: string): Promise<void> {
  const cmd = parseCommand(text);

  if (cmd.kind === "verify") {
    const userId = await resolveWhatsAppCode(from, cmd.code);
    const reply = userId
      ? "✅ ¡Número vinculado! Ya puedes añadir y completar tareas desde aquí."
      : "❌ Código inválido o caducado. Genera uno nuevo desde la app e inténtalo otra vez.";
    await sendMessage(from, reply);
    return;
  }

  const profile = await getUserByPhone(from);
  if (!profile) {
    await sendMessage(
      from,
      "Tu número no está vinculado a ninguna cuenta. Ve a Eunomia → Conexiones → WhatsApp, genera un código y escribe aquí: verificar <código>",
    );
    return;
  }

  if (cmd.kind === "add") {
    await addTaskForUser(profile.id, cmd.title);
    await sendMessage(
      from,
      `✅ Tarea añadida: «${cmd.title}» (prioridad media).`,
    );
    return;
  }

  if (cmd.kind === "complete") {
    const pending = await listPendingTasks(profile.id);
    const index = Number(cmd.target);
    const target =
      !Number.isNaN(index) && index >= 1
        ? pending[index - 1]
        : pending.find((t) => t.title.toLowerCase().includes(cmd.target.toLowerCase()));
    if (!target) {
      await sendMessage(
        from,
        "No encontré esa tarea. Envíame «listar» para ver tus pendientes numerados.",
      );
      return;
    }
    await completeTaskById(profile.id, target.id);
    await sendMessage(from, `✅ Completada: «${target.title}».`);
    return;
  }

  if (cmd.kind === "list") {
    await sendMessage(from, await formatPendingList(profile.id));
    return;
  }

  await sendMessage(from, HELP_TEXT);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verification token mismatch", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const typed = payload as {
    entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ type?: string; from?: string; text?: { body?: string } }> } }> }>;
  };

  for (const entry of typed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type !== "text" || !message.from || !message.text?.body) {
          continue;
        }
        await handleInbound(normalizePhone(message.from), message.text.body);
      }
    }
  }

  return NextResponse.json({ ok: true });
}