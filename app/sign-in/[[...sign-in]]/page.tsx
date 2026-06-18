"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Sign in failed.");
    }
    setLoading(false);
  }

  const inputCls = "w-full text-sm px-4 py-3 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition";

  return (
    <div className="min-h-screen bg-apple-silver flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-base font-bold tracking-tight text-apple-black">Foundree<span className="text-apple-blue">42</span></p>
          <p className="text-[10px] text-apple-gray italic mb-3">from raw to remarkable</p>
          <h1 className="text-2xl font-bold text-apple-black">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-apple-red/10 border border-apple-red/20 text-sm text-apple-red">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">Email</label>
            <input type="email" required autoComplete="email" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">Password</label>
            <input type="password" required autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-apple-blue hover:bg-apple-blue-hover disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors mt-2">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center pt-1">
            <Link href="/forgot-password"
              className="text-[11px] text-apple-gray hover:text-apple-blue transition-colors">
              Forgot password?
            </Link>
          </div>
        </form>

        <p className="text-center text-sm text-apple-gray mt-6">
          No account?{" "}
          <Link href="/sign-up" className="text-apple-blue hover:text-apple-blue-hover font-medium transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
