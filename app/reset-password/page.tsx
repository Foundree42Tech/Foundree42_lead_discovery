"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/sign-in"), 2500);
    } else {
      const data = await res.json();
      setError(data.error ?? "Password reset failed.");
    }
    setLoading(false);
  }

  const inputCls = "w-full text-sm px-4 py-3 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition";

  if (!token) return (
    <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 text-center space-y-3">
      <div className="text-4xl">❌</div>
      <p className="text-sm text-apple-gray">Invalid reset link. Please request a new one.</p>
      <Link href="/forgot-password"
        className="inline-block text-sm font-medium text-apple-blue hover:text-apple-blue-hover transition-colors">
        Request new link →
      </Link>
    </div>
  );

  if (success) return (
    <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 text-center space-y-3">
      <div className="text-4xl">✅</div>
      <h2 className="text-lg font-semibold text-apple-black">Password updated</h2>
      <p className="text-sm text-apple-gray">Redirecting you to sign in…</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 space-y-4">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-apple-red/10 border border-apple-red/20 text-sm text-apple-red">
          {error}
        </div>
      )}
      <div>
        <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">New Password</label>
        <input type="password" required autoComplete="new-password" placeholder="Min 8 characters"
          value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">Confirm Password</label>
        <input type="password" required autoComplete="new-password" placeholder="Repeat your password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-apple-blue hover:bg-apple-blue-hover disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors mt-2">
        {loading ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-apple-silver flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-base font-bold tracking-tight text-apple-black">Foundree<span className="text-apple-blue">42</span></p>
          <p className="text-[10px] text-apple-gray italic mb-3">from raw to remarkable</p>
          <h1 className="text-2xl font-bold text-apple-black">Reset password</h1>
        </div>
        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 text-center">
            <div className="w-8 h-8 border-2 border-apple-blue/30 border-t-apple-blue rounded-full animate-spin mx-auto" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-sm text-apple-gray mt-6">
          <Link href="/sign-in" className="text-apple-blue hover:text-apple-blue-hover font-medium transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
