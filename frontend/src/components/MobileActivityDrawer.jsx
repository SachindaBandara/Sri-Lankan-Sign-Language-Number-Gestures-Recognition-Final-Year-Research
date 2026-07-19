import React, { useEffect } from "react";
import { Plus, Minus, X, Divide } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "../i18n";

const MODULES = [
  { key: "addition", labelKey: "activity.addition", icon: Plus },
  { key: "subtraction", labelKey: "activity.subtraction", icon: Minus },
  { key: "multiplication", labelKey: "activity.multiplication", icon: X },
  { key: "division", labelKey: "activity.division", icon: Divide },
];

export default function MobileActivityDrawer({ open, onClose }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get("tab") || "addition";

  useEffect(() => {
    // lock background scroll while drawer open
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function select(key) {
    try {
      searchParams.set("tab", key);
      setSearchParams(searchParams, { replace: true });
    } catch {}
    onClose?.();
  }

  return (
    <>
      {/* overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden
      />

      {/* drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">{t("nav.activities")}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="p-3 space-y-2">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const active = current === m.key;
            return (
              <button
                key={m.key}
                onClick={() => select(m.key)}
                className={`w-full text-left inline-flex items-center gap-3 px-3 py-2 rounded-md ${active ? "bg-indigo-600 text-white" : "hover:bg-slate-100 text-slate-700"}`}
              >
                <Icon className="h-4 w-4" />
                {t(m.labelKey)}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
