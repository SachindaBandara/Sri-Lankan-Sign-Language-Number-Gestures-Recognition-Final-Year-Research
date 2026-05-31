import { useState } from "react";

import ActivityPage from "./ActivityPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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

  const [active, setActive] = useState("addition");

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList className="mb-4 bg-white shadow-sm">
          {ACTIVITY_MODULES.map((module) => (
            <TabsTrigger key={module.key} value={module.key}>
              <module.icon className="h-4 w-4 mr-2" />
              {module.label}
            </TabsTrigger>
          ))}
      </TabsList>
      {ACTIVITY_MODULES.map((module) => (
        <TabsContent key={module.key} value={module.key}>
            <ActivityPage operation={module.key} title={`${module.label}`} icon={module.icon} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
