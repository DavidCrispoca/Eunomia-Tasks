import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" demo={!isSupabaseConfigured()} />
    </Suspense>
  );
}