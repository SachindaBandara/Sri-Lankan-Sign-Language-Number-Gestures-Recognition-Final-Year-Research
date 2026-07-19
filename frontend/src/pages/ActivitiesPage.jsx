import { useState, useEffect } from "react";

import ActivityPage from "./ActivityPage";
import { Tabs, TabsContent } from "../components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "../i18n";
import { Plus, Minus, X, Divide } from "lucide-react";

export default function ActivitiesPage() {
  const { t } = useTranslation();

  const ACTIVITY_MODULES = [
    { key: "addition", label: t("activity.addition") || "Addition", icon: Plus },
    { key: "subtraction", label: t("activity.subtraction") || "Subtraction", icon: Minus },
    { key: "multiplication", label: t("activity.multiplication") || "Multiplication", icon: X },
    { key: "division", label: t("activity.division") || "Division", icon: Divide },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get("tab") || "addition";
  const [active, setActive] = useState(initial);

  // keep URL in sync when the active tab changes
  const handleChange = (value) => {
    setActive(value);
    try {
      searchParams.set("tab", value);
      setSearchParams(searchParams, { replace: true });
    } catch {}
  };

  // keep local active in sync when header nav (which updates the URL) changes
  useEffect(() => {
    const current = searchParams.get("tab") || "addition";
    if (current !== active) setActive(current);
  }, [searchParams]);

  return (
    <Tabs value={active} onValueChange={handleChange}>
      {ACTIVITY_MODULES.map((module) => (
        <TabsContent key={module.key} value={module.key}>
          <ActivityPage operation={module.key} title={`${module.label}`} icon={module.icon} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
