import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <p className="eyebrow text-center">Welcome back</p>
        <h1 className="mt-1 text-center text-3xl">Log in to DMS</h1>
        <p className="mb-7 mt-2 text-center text-sm text-muted">Chat with us, track your inquiries and save favorites.</p>
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
