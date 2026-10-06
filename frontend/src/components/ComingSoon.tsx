import { Rocket } from "lucide-react";

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40">
        <Rocket className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-500">{description}</p>
      <span className="chip mt-5">Coming soon</span>
    </div>
  );
}