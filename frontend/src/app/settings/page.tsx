"use client";
import { useState } from "react";
import { Bell, CreditCard, Palette, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/useTheme";
import { useToast } from "@/components/ToastProvider";
import ComingSoon from "@/components/ComingSoon";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={on} className={cn("relative h-6 w-11 rounded-full transition", on ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { dark, toggle } = useTheme();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("profile");
  const [notif, setNotif] = useState({ email: true, summary: true, tasks: false });

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={cn("flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
              tab === id ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>

        <div className="card p-6">
          {tab === "profile" && (
            <div className="max-w-md space-y-4">
              <h2 className="font-semibold">Profile</h2>
              <div><label className="label">Full name</label><input className="input" defaultValue="Sanjana Raghunath" /></div>
              <div><label className="label">Email</label><input className="input" defaultValue="sanjrag05@gmail.com" /></div>
              <button className="btn btn-primary" onClick={() => toast("Profile saved (demo — no auth)")}>Save changes</button>
            </div>
          )}
          {tab === "notifications" && (
            <div className="space-y-5">
              <h2 className="font-semibold">Notifications</h2>
              {([["email", "Email me when notes are ready"], ["summary", "Weekly meeting digest"], ["tasks", "Remind me about overdue tasks"]] as const).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between"><span className="text-sm">{label}</span>
                  <Toggle on={notif[k]} onChange={() => { setNotif({ ...notif, [k]: !notif[k] }); toast("Preference saved"); }} /></div>
              ))}
            </div>
          )}
          {tab === "appearance" && (
            <div className="space-y-4">
              <h2 className="font-semibold">Appearance</h2>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Dark mode</p><p className="text-xs text-slate-500">Easier on the eyes in low light.</p></div><Toggle on={dark} onChange={toggle} /></div>
            </div>
          )}
          {tab === "billing" && <ComingSoon title="Billing & plans" description="Manage your subscription and invoices here soon." />}
        </div>
      </div>
    </div>
  );
}