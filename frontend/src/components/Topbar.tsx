"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Plus, Search, Settings, Sun } from "lucide-react";
import { useUI } from "./AppShell";
import { useToast } from "./ToastProvider";
import { useTheme } from "@/lib/useTheme";
import Avatar from "./Avatar";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { openNewMeeting, openSearch } = useUI();
  const { toast } = useToast();
  const { dark, toggle } = useTheme();
  const router = useRouter();
  const [bell, setBell] = useState(false);
  const [profile, setProfile] = useState(false);

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <button onClick={onMenu} className="btn-ghost rounded-lg p-2 lg:hidden"><Menu className="h-5 w-5" /></button>

      <button onClick={openSearch}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800">
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search all meetings…</span>
        <kbd className="hidden rounded border border-slate-300 px-1.5 text-[11px] sm:block dark:border-slate-600">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button onClick={openNewMeeting} className="btn btn-primary"><Plus className="h-4 w-4" /><span className="hidden sm:inline">New meeting</span></button>
        <button onClick={toggle} className="btn-ghost rounded-lg p-2" aria-label="Toggle theme">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative">
          <button onClick={() => { setBell(!bell); setProfile(false); }} className="btn-ghost relative rounded-lg p-2">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" />
          </button>
          {bell && (
            <div className="card absolute right-0 mt-2 w-72 p-3 text-sm shadow-xl">
              <p className="mb-2 font-semibold">Notifications</p>
              <p className="rounded-lg bg-slate-50 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">✨ Your meeting notes are ready.</p>
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">✅ You have open action items.</p>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => { setProfile(!profile); setBell(false); }}><Avatar name="Alex Morgan" /></button>
          {profile && (
            <div className="card absolute right-0 mt-2 w-56 p-1.5 text-sm shadow-xl">
              <div className="px-3 py-2">
                <p className="font-semibold">Alex Morgan</p>
                <p className="text-xs text-slate-500">alex.morgan@example.com</p>
              </div>
              <button onClick={() => { setProfile(false); router.push("/settings"); }} className="btn-ghost flex w-full items-center gap-2 rounded-lg px-3 py-2"><Settings className="h-4 w-4" />Settings</button>
              <button onClick={() => { setProfile(false); toast("Authentication is disabled in this demo.", "info"); }} className="btn-ghost flex w-full items-center gap-2 rounded-lg px-3 py-2"><LogOut className="h-4 w-4" />Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}