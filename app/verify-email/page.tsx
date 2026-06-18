"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");

  const [status,  setStatus]  = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please use the link from your email.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => router.push("/"), 2000);
        } else {
          const data = await res.json();
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token, router]);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 text-center space-y-4">
      {status === "loading" && (
        <>
          <div className="w-8 h-8 border-2 border-apple-blue/30 border-t-apple-blue rounded-full animate-spin mx-auto" />
          <p className="text-sm text-apple-gray">Verifying your email…</p>
        </>
      )}
      {status === "success" && (
        <>
          <div className="text-4xl">✅</div>
          <h2 className="text-lg font-semibold text-apple-black">Email verified!</h2>
          <p className="text-sm text-apple-gray">Redirecting you to the app…</p>
        </>
      )}
      {status === "error" && (
        <>
          <div className="text-4xl">❌</div>
          <h2 className="text-lg font-semibold text-apple-black">Verification failed</h2>
          <p className="text-sm text-apple-gray leading-relaxed">{message}</p>
          <Link href="/sign-up"
            className="inline-block mt-2 text-sm font-medium text-apple-blue hover:text-apple-blue-hover transition-colors">
            Register again →
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-apple-silver flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-[0.2em] mb-2">Foundree42</p>
          <h1 className="text-2xl font-bold text-apple-black">Email Verification</h1>
        </div>
        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 text-center">
            <div className="w-8 h-8 border-2 border-apple-blue/30 border-t-apple-blue rounded-full animate-spin mx-auto" />
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
