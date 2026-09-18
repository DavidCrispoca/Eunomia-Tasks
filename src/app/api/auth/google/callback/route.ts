import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverClient, isSupabaseConfigured } from "@/lib/auth/supabase-callback";
import { endSession, startSession } from "@/lib/auth/cookies";
import { isAllowedEmail } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const flowId = url.searchParams.get("sb_flow_id") ?? undefined;

  if (url.searchParams.get("error")) {
    redirect("/login?error=invalid");
  }

  if (!code || !isSupabaseConfigured()) {
    redirect("/login?error=notConfigured");
  }

  const store = await cookies();
  const client = serverClient(store);
  const { data, error } = await client.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );
  const email = data.user?.email;

  if (error || !email) {
    redirect("/login?error=invalid");
  }

  if (!isAllowedEmail(email)) {
    await endSession();
    redirect("/login?error=notAllowed");
  }

  const metadata = data.user!.user_metadata ?? {};
  const name =
    typeof metadata.name === "string"
      ? metadata.name
      : typeof metadata.full_name === "string"
        ? metadata.full_name
        : undefined;

  await startSession({
    id: data.user!.id,
    email,
    name,
  });
  redirect("/");
}