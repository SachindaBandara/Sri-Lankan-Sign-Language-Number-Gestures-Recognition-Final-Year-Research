import { useState } from "react";

import ActivityPage from "./ActivityPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const ACTIVITY_MODULES = [
  { key: "addition", label: "Addition" },
  { key: "subtraction", label: "Subtraction" },
  { key: "multiplication", label: "Multiplication" },
  { key: "division", label: "Division" },
];

export default function ActivitiesPage() {
  const [active, setActive] = useState("addition");

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList className="mb-4 bg-white shadow-sm">
        {ACTIVITY_MODULES.map((module) => (
          <TabsTrigger key={module.key} value={module.key}>
            {module.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {ACTIVITY_MODULES.map((module) => (
        <TabsContent key={module.key} value={module.key}>
          <ActivityPage operation={module.key} title={`${module.label} Activity`} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
