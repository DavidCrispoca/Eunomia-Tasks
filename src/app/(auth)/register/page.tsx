import { isSupabaseConfigured } from "@/lib/auth/config";
import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return <AuthForm mode="register" demo={!isSupabaseConfigured()} />;
}