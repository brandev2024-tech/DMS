import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <p className="eyebrow text-center">It&apos;s free</p>
        <h1 className="mt-1 text-center text-3xl">Create your account</h1>
        <p className="mb-7 mt-2 text-center text-sm text-muted">Use Direct Ask to chat with us right here on the site. 💕</p>
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </div>
    </div>
  );
}
