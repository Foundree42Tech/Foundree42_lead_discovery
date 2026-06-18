"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignUpPage() {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Sign up failed.");
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
          <h1 className="text-2xl font-bold text-apple-black">Create account</h1>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 text-center space-y-3">
            <div className="text-4xl">✉️</div>
            <h2 className="text-lg font-semibold text-apple-black">Check your inbox</h2>
            <p className="text-sm text-apple-gray leading-relaxed">
              We sent a verification link to <span className="font-medium text-apple-black">{email}</span>.
              Click the link to activate your account.
            </p>
            <p className="text-xs text-apple-gray pt-2">The link expires in 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-8 space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-apple-red/10 border border-apple-red/20 text-sm text-apple-red">
                {error}
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">Name</label>
              <input type="text" autoComplete="name" placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">Email</label>
              <input type="email" required autoComplete="email" placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5">Password</label>
              <input type="password" required autoComplete="new-password" placeholder="Min 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-apple-blue hover:bg-apple-blue-hover disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors mt-2">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-apple-gray mt-6">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-apple-blue hover:text-apple-blue-hover font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
