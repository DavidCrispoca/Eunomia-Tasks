import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" demo={!isSupabaseConfigured()} />
    </Suspense>
  );
}