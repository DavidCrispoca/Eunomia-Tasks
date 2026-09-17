import { isSupabaseConfigured } from "@/lib/auth/config";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return <AuthForm mode="login" demo={!isSupabaseConfigured()} />;
}