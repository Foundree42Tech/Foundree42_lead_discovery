"use client";
import { useState } from "react";
import { useToast } from "./Toast";

interface Contact {
  name: string;
  title: string;
  email: string;
  linkedin: string;
}

export default function ContactCard({ contact, isPrimary }: { contact: Contact; isPrimary: boolean }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      showToast("Email copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy email", "error");
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-apple-silver border border-black/5">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-apple-blue flex items-center justify-center">
        <span className="text-white text-xs font-semibold">{initials || "?"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-apple-black truncate">{contact.name}</span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              isPrimary ? "bg-apple-blue/10 text-apple-blue" : "bg-apple-gray/10 text-apple-gray"
            }`}
          >
            {isPrimary ? "Primary" : "Secondary"}
          </span>
        </div>
        <p className="text-xs text-apple-gray truncate">{contact.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {contact.email && (
            <div className="flex items-center gap-1 group">
              <a
                href={`mailto:${contact.email}`}
                className="text-xs text-apple-blue hover:underline truncate max-w-[180px]"
              >
                {contact.email}
              </a>
              <button
                onClick={copyEmail}
                title="Copy email"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/5 active:scale-95 transition-transform"
              >
                {copied ? (
                  <svg className="w-3 h-3 text-apple-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-apple-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          )}
          {contact.linkedin && (
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-apple-blue hover:text-apple-blue-hover transition-colors"
            >
              LinkedIn →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
