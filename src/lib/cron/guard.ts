import "server-only";

/**
 * Autoriza una invocación de cron:
 * - Producción: cabecera `x-vercel-cron` (la añade Vercel) o `Authorization: Bearer <CRON_SECRET>`.
 * - Local: sin restricciones para poder probar manualmente.
 */
export function isAuthorizedCron(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (request.headers.get("x-vercel-cron")) return true;
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return true;
  }
  return false;
}