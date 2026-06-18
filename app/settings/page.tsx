"use client";
import { useState, useEffect } from "react";
import Sidebar, { SearchParams, SearchHistory } from "@/components/Sidebar";
import { useToast } from "@/components/Toast";
import { applyTheme, type Theme } from "@/components/ThemeProvider";

type SettingsTab = "profile" | "apikeys" | "notifications" | "salesforce";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney",
];

interface Profile {
  name: string;
  email: string;
  timezone: string;
  theme: string;
  weeklyGoal: number;
  notifPrefs: { hotLeadAlert: boolean; weeklyDigest: boolean; sfSyncAlert: boolean };
  sfConnected: boolean;
  sfInstanceUrl: string | null;
}

interface KeyStatus { anthropic: boolean; apollo: boolean; tavily: boolean; salesforce: boolean; }

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
        active ? "bg-apple-blue/10 text-apple-blue" : "text-apple-gray hover:text-apple-black hover:bg-apple-silver"
      }`}
    >
      {children}
    </button>
  );
}

function CallbackUrlField() {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => { setUrl(`${window.location.origin}/api/auth/salesforce/callback`); }, []);
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-xs px-3 py-2.5 rounded-xl bg-apple-silver text-apple-black border border-black/5 truncate">
        {url || "…"}
      </code>
      <button
        onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="text-xs font-medium text-apple-blue hover:text-apple-blue-hover transition-colors flex-shrink-0 px-2"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-apple-blue" : "bg-black/15"}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-5" : "left-1"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<SettingsTab>("profile");

  const [profile, setProfile] = useState<Profile>({
    name: "", email: "", timezone: "America/New_York", theme: "light", weeklyGoal: 20,
    notifPrefs: { hotLeadAlert: true, weeklyDigest: true, sfSyncAlert: false },
    sfConnected: false, sfInstanceUrl: null,
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [keys, setKeys] = useState({ anthropic: "", apollo: "", tavily: "" });
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({ anthropic: false, apollo: false, tavily: false, salesforce: false });
  const [keysSaving, setKeysSaving] = useState(false);

  const [sfLoading, setSfLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then(r => r.json())
      .then((d: Partial<Profile> & { email?: string }) => {
        setProfile(prev => ({
          ...prev,
          name:         d.name ?? "",
          email:        d.email ?? "",
          timezone:     d.timezone ?? "America/New_York",
          theme:        d.theme ?? "light",
          weeklyGoal:   d.weeklyGoal ?? 20,
          notifPrefs:   (d.notifPrefs as Profile["notifPrefs"]) ?? prev.notifPrefs,
          sfConnected:  d.sfConnected ?? false,
          sfInstanceUrl: d.sfInstanceUrl ?? null,
        }));
      })
      .catch(() => {});
    fetch("/api/config")
      .then(r => r.json())
      .then((d: Record<string, boolean>) => setKeyStatus({ anthropic: !!d.anthropic, apollo: !!d.apollo, tavily: !!d.tavily, salesforce: !!d.salesforce }))
      .catch(() => {});
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profile.name, timezone: profile.timezone, theme: profile.theme, weeklyGoal: profile.weeklyGoal }),
    });
    if (res.ok) showToast("Profile saved"); else showToast("Save failed", "error");
    setProfileSaving(false);
  }

  async function saveNotifPrefs() {
    const res = await fetch("/api/user/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifPrefs: profile.notifPrefs }),
    });
    if (res.ok) showToast("Preferences saved"); else showToast("Save failed", "error");
  }

  async function saveKeys() {
    setKeysSaving(true);
    const payload: Record<string, string> = {};
    if (keys.anthropic) payload.anthropic = keys.anthropic;
    if (keys.apollo)    payload.apollo    = keys.apollo;
    if (keys.tavily)    payload.tavily    = keys.tavily;
    const res = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      showToast("API keys saved");
      setKeys({ anthropic: "", apollo: "", tavily: "" });
      const fresh = await fetch("/api/config").then(r => r.json()) as Record<string, boolean>;
      setKeyStatus({ anthropic: !!fresh.anthropic, apollo: !!fresh.apollo, tavily: !!fresh.tavily, salesforce: !!fresh.salesforce });
    } else {
      showToast("Save failed", "error");
    }
    setKeysSaving(false);
  }

  async function disconnectSF() {
    setSfLoading(true);
    await fetch("/api/auth/salesforce", { method: "DELETE" });
    setProfile(p => ({ ...p, sfConnected: false, sfInstanceUrl: null }));
    setSfLoading(false);
    showToast("Salesforce disconnected");
  }

  const inputCls = "w-full text-sm px-4 py-3 rounded-xl bg-apple-silver border border-black/5 text-apple-black placeholder-black/25 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition";
  const labelCls = "text-[10px] font-semibold text-apple-gray uppercase tracking-widest block mb-1.5";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        keyStatus={keyStatus}
        metrics={{ total: 0, hot: 0, verified: 0, avgScore: 0 }}
        onKeySave={() => {}}
        recentSearches={[] as SearchHistory[]}
        onRerunSearch={(_p: SearchParams) => {}}
      />

      <main className="ml-[260px] flex-1 px-8 py-10 max-w-6xl w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-apple-black tracking-tight">Settings</h2>
          <p className="text-apple-gray mt-1">Manage your profile, integrations, and preferences.</p>
        </div>

        <div className="flex gap-6">
          {/* Tab list */}
          <div className="w-44 flex-shrink-0 space-y-0.5">
            <TabBtn active={tab === "profile"}       onClick={() => setTab("profile")}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              Profile
            </TabBtn>
            <TabBtn active={tab === "apikeys"}       onClick={() => setTab("apikeys")}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              API Keys
            </TabBtn>
            <TabBtn active={tab === "notifications"} onClick={() => setTab("notifications")}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              Notifications
            </TabBtn>
            <TabBtn active={tab === "salesforce"}    onClick={() => setTab("salesforce")}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
              Salesforce
            </TabBtn>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            {tab === "profile" && (
              <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6 space-y-5 animate-fadeIn">
                <h3 className="text-base font-semibold text-apple-black">Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input className={inputCls} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Shawn Rogers" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input value={profile.email} readOnly disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                  </div>
                  <div>
                    <label className={labelCls}>Timezone</label>
                    <select className={inputCls} value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}>
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Weekly Lead Goal</label>
                    <input type="number" min={1} max={200} className={inputCls} value={profile.weeklyGoal}
                      onChange={e => setProfile(p => ({ ...p, weeklyGoal: parseInt(e.target.value) || 20 }))} />
                    <p className="text-[10px] text-apple-gray mt-1">Drives progress bars in sidebar</p>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Appearance</label>
                  <div className="flex gap-2">
                    {(["light", "dark", "system"] as const).map(t => (
                      <button key={t} onClick={() => { setProfile(p => ({ ...p, theme: t })); applyTheme(t as Theme); }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors capitalize ${
                          profile.theme === t ? "border-apple-blue text-apple-blue bg-apple-blue/5" : "border-black/10 text-apple-gray hover:text-apple-black"
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>

                <button onClick={saveProfile} disabled={profileSaving}
                  className="bg-apple-blue hover:bg-apple-blue-hover text-white font-semibold text-sm px-6 py-3 rounded-xl transition active:scale-95 disabled:opacity-50">
                  {profileSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}

            {tab === "apikeys" && (
              <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6 space-y-5 animate-fadeIn">
                <h3 className="text-base font-semibold text-apple-black">API Keys</h3>
                <p className="text-sm text-apple-gray">Keys are stored encrypted in your database. Leave blank to keep existing values.</p>

                {[
                  { name: "anthropic" as const, label: "Anthropic",  placeholder: "sk-ant-api03-…", desc: "Required for AI discovery and outreach generation." },
                  { name: "apollo"    as const, label: "Apollo.io",  placeholder: "apollo-key-…",   desc: "Company and contact data enrichment." },
                  { name: "tavily"    as const, label: "Tavily",     placeholder: "tvly-…",          desc: "Live web search signals for company research." },
                ].map(({ name, label, placeholder, desc }) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={labelCls}>{label}</label>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${keyStatus[name] ? "bg-apple-green/10 text-apple-green" : "bg-apple-gray/10 text-apple-gray"}`}>
                        {keyStatus[name] ? "Configured" : "Not set"}
                      </span>
                    </div>
                    <input type="password" placeholder={keyStatus[name] ? "••••••••••••••••" : placeholder}
                      value={keys[name]} onChange={e => setKeys(k => ({ ...k, [name]: e.target.value }))}
                      className={inputCls} />
                    <p className="text-[10px] text-apple-gray mt-1">{desc}</p>
                  </div>
                ))}

                <button onClick={saveKeys} disabled={keysSaving || (!keys.anthropic && !keys.apollo && !keys.tavily)}
                  className="bg-apple-blue hover:bg-apple-blue-hover text-white font-semibold text-sm px-6 py-3 rounded-xl transition active:scale-95 disabled:opacity-50">
                  {keysSaving ? "Saving…" : "Save keys"}
                </button>
              </div>
            )}

            {tab === "notifications" && (
              <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6 space-y-4 animate-fadeIn">
                <h3 className="text-base font-semibold text-apple-black">Notifications</h3>
                <p className="text-sm text-apple-gray">Control what activity sends you an email.</p>
                {[
                  { key: "hotLeadAlert" as const,  label: "Hot lead alert",           desc: "Email when a new lead scores 80 or above." },
                  { key: "weeklyDigest" as const,  label: "Weekly digest",             desc: "Sunday summary of leads, outreach, and pipeline." },
                  { key: "sfSyncAlert"  as const,  label: "Salesforce sync failures", desc: "Alert if a lead fails to push to Salesforce." },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-black/[0.04] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-apple-black">{label}</p>
                      <p className="text-xs text-apple-gray mt-0.5">{desc}</p>
                    </div>
                    <Toggle
                      checked={profile.notifPrefs[key]}
                      onChange={v => {
                        const updated = { ...profile.notifPrefs, [key]: v };
                        setProfile(p => ({ ...p, notifPrefs: updated }));
                        fetch("/api/user/profile", {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ notifPrefs: updated }),
                        }).then(() => showToast("Preferences saved")).catch(() => {});
                      }}
                    />
                  </div>
                ))}
                <button onClick={saveNotifPrefs}
                  className="hidden bg-apple-blue hover:bg-apple-blue-hover text-white font-semibold text-sm px-6 py-3 rounded-xl transition active:scale-95">
                  Save preferences
                </button>
              </div>
            )}

            {tab === "salesforce" && (
              <div className="bg-white rounded-2xl shadow-card border border-black/[0.04] p-6 space-y-5 animate-fadeIn">
                <h3 className="text-base font-semibold text-apple-black">Salesforce</h3>

                {profile.sfConnected ? (
                  <>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-apple-green/5 border border-apple-green/20">
                      <div className="w-3 h-3 rounded-full bg-apple-green flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-apple-black">Connected</p>
                        <p className="text-xs text-apple-gray">{profile.sfInstanceUrl}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={disconnectSF} disabled={sfLoading}
                        className="text-sm font-medium text-apple-red hover:opacity-70 transition-opacity disabled:opacity-40">
                        {sfLoading ? "Disconnecting…" : "Disconnect Salesforce"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-apple-gray/5 border border-black/[0.06]">
                      <div className="w-3 h-3 rounded-full bg-black/20 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-apple-black">Not connected</p>
                        <p className="text-xs text-apple-gray">Connect your Salesforce org to push leads directly.</p>
                      </div>
                    </div>
                    <button onClick={() => { window.location.href = "/api/auth/salesforce"; }}
                      className="bg-apple-blue hover:bg-apple-blue-hover text-white font-semibold text-sm px-6 py-3 rounded-xl transition active:scale-95">
                      Connect Salesforce →
                    </button>
                  </>
                )}

                <div className="pt-2">
                  <p className="text-[10px] font-semibold text-apple-gray uppercase tracking-widest mb-2">How to connect Salesforce</p>
                  <p className="text-xs text-apple-gray mb-3">
                    A one-time setup creates a Connected App in your Salesforce org, then the
                    <span className="font-medium text-apple-black"> Connect Salesforce</span> button above runs the OAuth login.
                  </p>
                  {[
                    { t: "Open the Connected App wizard", d: "In Salesforce: Setup → App Manager → New Connected App (Lightning) or New Connected App." },
                    { t: "Enable OAuth", d: "Check \"Enable OAuth Settings\" and add the scopes: api, refresh_token, offline_access." },
                    { t: "Set the callback URL", d: "Paste the exact callback URL shown below into the Connected App's Callback URL field." },
                    { t: "Copy the credentials", d: "After saving, copy the Consumer Key and Consumer Secret." },
                    { t: "Add them to the server env", d: "Set SF_CLIENT_ID, SF_CLIENT_SECRET, and SF_CALLBACK_URL in your deployment's environment variables (see DEPLOY.md), then redeploy." },
                    { t: "Connect", d: "Wait ~10 minutes for Salesforce to propagate the app, then click \"Connect Salesforce\" above and approve access." },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-black/[0.04] last:border-0">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-apple-silver text-apple-gray text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-xs font-medium text-apple-black">{step.t}</p>
                        <p className="text-[11px] text-apple-gray leading-snug">{step.d}</p>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4">
                    <label className={labelCls}>Your callback URL</label>
                    <CallbackUrlField />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
