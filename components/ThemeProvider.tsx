"use client";
import { useEffect } from "react";

export type Theme = "light" | "dark" | "system";

/** Apply a theme: toggles the `dark` class on <html> and persists the choice. */
export function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem("theme", theme); } catch { /* ignore */ }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Apply whatever we cached locally first (instant, no flash).
    const cached = (localStorage.getItem("theme") as Theme | null) ?? "light";
    applyTheme(cached);

    // 2. Sync with the server-stored preference once it loads.
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d: { theme?: Theme }) => { if (d.theme) applyTheme(d.theme); })
      .catch(() => {});

    // 3. React to OS theme changes while on "system".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem("theme") as Theme | null) ?? "light";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return <>{children}</>;
}
