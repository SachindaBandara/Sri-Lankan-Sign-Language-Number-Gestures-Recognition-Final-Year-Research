import React from "react";
import { Plus, Minus, X, Divide } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import { useTranslation } from "../i18n";

const ACTIVITY_MODULES = [
  { key: "addition", labelKey: "activity.addition", icon: Plus },
  { key: "subtraction", labelKey: "activity.subtraction", icon: Minus },
  { key: "multiplication", labelKey: "activity.multiplication", icon: X },
  { key: "division", labelKey: "activity.division", icon: Divide },
];

export default function ActivityNav({ className }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get("tab") || "addition";

  function select(key) {
    searchParams.set("tab", key);
    setSearchParams(searchParams, { replace: true });
  }

  return (
    <div className={cn("flex gap-2 overflow-x-auto px-1 py-1", className)}>
      {ACTIVITY_MODULES.map((m) => {
        const Icon = m.icon;
        const active = current === m.key;
        return (
          <button
            key={m.key}
            onClick={() => select(m.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition whitespace-nowrap",
              active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(m.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
