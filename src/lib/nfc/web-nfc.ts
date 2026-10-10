import { NFC_MODES } from "./types";

export interface NfcTagReadResult {
  token: string | null;
  modeCode: string | null;
  /** Texto crudo leído (útil para diagnóstico). */
  raw: string | null;
}

interface NdefRecordLike {
  recordType?: string;
  data?: unknown;
  text?: unknown;
}

interface NdefReadingEventLike {
  message?: { records?: NdefRecordLike[] };
}

interface NdefReaderLike {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: NdefReadingEventLike) => void) | null;
}

interface NdefReaderCtor {
  new (): NdefReaderLike;
}

function getNdefReader(): NdefReaderCtor | null {
  const ctor = (globalThis as unknown as { NDEFReader?: NdefReaderCtor })
    .NDEFReader;
  return ctor ?? null;
}

/** Web NFC solo está disponible en Chromium/Android sobre HTTPS. */
export function isWebNfcSupported(): boolean {
  return typeof window !== "undefined" && getNdefReader() !== null;
}

function decodeRecordText(record: NdefRecordLike): string | null {
  const direct = record.text ?? record.data;
  if (typeof direct === "string") return direct;
  if (!(direct instanceof ArrayBuffer) && !ArrayBuffer.isView(direct)) return null;

  const bytes =
    direct instanceof ArrayBuffer
      ? new Uint8Array(direct)
      : new Uint8Array(
          direct.buffer,
          direct.byteOffset,
          direct.byteLength,
        );

  const type = (record.recordType ?? "").toLowerCase();
  let start = 0;
  if (type === "text" && bytes.length > 0) {
    start = 1 + (bytes[0] & 0x3f);
  }
  try {
    return new TextDecoder().decode(bytes.subarray(start)).trim();
  } catch {
    return null;
  }
}

function parsePayload(text: string, raw: string): NfcTagReadResult {
  const url = text.match(/\/scan\/([A-Za-z0-9_-]+)/);
  if (url) return { token: url[1], modeCode: null, raw };

  const trimmed = text.trim();
  if (NFC_MODES.some((mode) => mode.code === trimmed)) {
    return { token: null, modeCode: trimmed, raw };
  }
  if (/^[A-Za-z0-9_-]{4,}$/.test(trimmed)) {
    return { token: trimmed, modeCode: null, raw };
  }
  return { token: null, modeCode: null, raw };
}

/**
 * Lee una tarjeta y resuelve su token o modo. Devuelve null si no se apoya Web
 * NFC o si se agota el tiempo. Lanza solo si el usuario deniega el permiso.
 */
export async function readTagOnce(
  timeoutMs = 20000,
): Promise<NfcTagReadResult | null> {
  const Reader = getNdefReader();
  if (!Reader) return null;

  const reader = new Reader();
  const controller = new AbortController();

  return new Promise<NfcTagReadResult | null>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);

    reader.onreading = (event) => {
      clearTimeout(timer);
      controller.abort();
      const records = event.message?.records ?? [];
      for (const record of records) {
        const text = decodeRecordText(record);
        if (!text) continue;
        const parsed = parsePayload(text, text);
        if (parsed.token || parsed.modeCode) {
          resolve(parsed);
          return;
        }
      }
      resolve({ token: null, modeCode: null, raw: null });
    };

    reader.scan({ signal: controller.signal }).catch((error: unknown) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
