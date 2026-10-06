"use client";
import { Calendar, Cloud, Database, Hash, MessageSquare, Video } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const APPS = [
  { name: "Zoom", desc: "Auto-join and record Zoom meetings.", icon: Video },
  { name: "Google Meet", desc: "Capture Google Meet conversations.", icon: Video },
  { name: "Microsoft Teams", desc: "Transcribe your Teams calls.", icon: MessageSquare },
  { name: "Google Calendar", desc: "Pick which events the bot joins.", icon: Calendar },
  { name: "Slack", desc: "Post summaries to your channels.", icon: Hash },
  { name: "Salesforce", desc: "Sync notes & tasks to your CRM.", icon: Cloud },
  { name: "HubSpot", desc: "Log meetings on contact records.", icon: Database },
  { name: "Notion", desc: "Export notes to your workspace.", icon: Database },
];

export default function IntegrationsPage() {
  const { toast } = useToast();
  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="mb-6 text-sm text-slate-500">Connect Fireflies to the tools your team already uses.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {APPS.map(({ name, desc, icon: Icon }) => (
          <div key={name} className="card flex flex-col p-5">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"><Icon className="h-5 w-5 text-brand-600" /></span>
            <h3 className="font-semibold">{name}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-500">{desc}</p>
            <button className="btn btn-secondary mt-4 w-full" onClick={() => toast(`${name} integration is coming soon`, "info")}>Coming soon</button>
          </div>
        ))}
      </div>
    </div>
  );
}