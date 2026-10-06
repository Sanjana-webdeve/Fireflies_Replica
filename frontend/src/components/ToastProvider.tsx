"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
interface ToastItem { id: number; message: string; kind: Kind }

const Ctx = createContext<{ toast: (message: string, kind?: Kind) => void }>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, message, kind }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colors = { success: "text-emerald-500", error: "text-red-500", info: "text-brand-500" };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {items.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <Icon className={cn("h-5 w-5 shrink-0", colors[t.kind])} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}