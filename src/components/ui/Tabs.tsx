"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  variant?: "default" | "pills" | "underline";
  className?: string;
}

export function Tabs({
  tabs,
  active,
  onChange,
  variant = "pills",
  className,
}: TabsProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200",
            variant === "pills" && "rounded-lg",
            variant === "underline" && "border-b-2 rounded-none",
            active === tab.id
              ? variant === "pills"
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
                : "border-brand-600 text-brand-700"
              : variant === "pills"
                ? "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                : "border-transparent text-slate-500 hover:text-brand-600"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
