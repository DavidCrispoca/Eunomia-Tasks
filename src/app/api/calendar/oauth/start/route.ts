import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/cookies";
import { authorizeUrl } from "@/lib/calendar/google";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.demo) {
    redirect("/login");
  }
  redirect(authorizeUrl(user.id));
}