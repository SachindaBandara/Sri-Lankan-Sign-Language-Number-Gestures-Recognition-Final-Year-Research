import { Calculator, Hand, Home } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import ActivitiesPage from "./pages/ActivitiesPage";
import ActivityReportPage from "./pages/ActivityReportPage";
import HomePage from "./pages/HomePage";
import NumberIdentificationPage from "./pages/NumberIdentificationPage";
import { Card, CardContent } from "./components/ui/card";
import { cn } from "./lib/utils";
import { I18nProvider, useTranslation } from "./i18n";
import LanguageSelector from "./components/LanguageSelector";

function InnerApp() {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { path: "/", label: t("nav.home"), icon: Home },
    { path: "/number-identification", label: t("nav.number"), icon: Hand },
    { path: "/activities", label: t("nav.activities"), icon: Calculator },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="flex items-center justify-end mb-4">
        <LanguageSelector />
      </div>
      <Card className="mb-5 border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl">
        <CardContent className="space-y-2 py-6 sm:py-7 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
            <p className="text-sm text-blue-100 sm:text-base">{t("subtitle")}</p>
          </div>
        </CardContent>
      </Card>
      <nav className="mb-5 flex flex-wrap gap-2 rounded-lg bg-white p-2 shadow-sm">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/number-identification" element={<NumberIdentificationPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/activity-report" element={<ActivityReportPage />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <InnerApp />
    </I18nProvider>
  );
}
