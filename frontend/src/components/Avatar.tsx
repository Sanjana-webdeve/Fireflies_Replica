import { cn, initials, speakerColor } from "@/lib/utils";

export default function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      title={name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white dark:ring-slate-900",
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs", speakerColor(name), className)}
    >
      {initials(name)}
    </span>
  );
}