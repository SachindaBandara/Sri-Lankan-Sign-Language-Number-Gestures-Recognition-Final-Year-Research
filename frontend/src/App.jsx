import { Calculator, Hand, Home } from "lucide-react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import ActivitiesPage from "./pages/ActivitiesPage";
import ActivityReportPage from "./pages/ActivityReportPage";
import HomePage from "./pages/HomePage";
import NumberIdentificationPage from "./pages/NumberIdentificationPage";
import { Card, CardContent } from "./components/ui/card";
import { cn } from "./lib/utils";
import { I18nProvider, useTranslation } from "./i18n";
import LanguageSelector from "./components/LanguageSelector";
import ActivityNav from "./components/ActivityNav";

function InnerApp() {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { path: "/", label: t("nav.home"), icon: Home },
    { path: "/number-identification", label: t("nav.number"), icon: Hand },
    { path: "/activities", label: t("nav.activities"), icon: Calculator },
  ];
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="sm:hidden">
              <h2 className="text-lg font-semibold">{t("title")}</h2>
            </div>
            <div className="ml-auto">
              <LanguageSelector />
            </div>
            <div className="sm:hidden">
              <button
                aria-label="Toggle menu"
                onClick={() => setMobileNavOpen((s) => !s)}
                className="p-2 rounded-md bg-white/70 hover:bg-white"
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Card className="mb-3 border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl">
            <CardContent className="space-y-2 py-4 sm:py-5 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
                <p className="text-sm text-blue-100 sm:text-base">{t("subtitle")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Desktop nav */}
          <nav className="hidden sm:flex mb-0 flex-wrap gap-2 rounded-lg bg-white p-2 shadow-sm">
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

          {/* Mobile nav panel (opened by hamburger) */}
          {mobileNavOpen && (
            <nav className="sm:hidden mt-3 rounded-lg bg-white p-3 shadow-md">
              <div className="flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition w-full text-left",
                        isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          )}

          {/* Activity tabs move into the header when on the /activities route */}
          {location.pathname === "/activities" && (
            <div className="mt-3">
              <ActivityNav />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pt-72 sm:px-6 sm:pt-80 sm:py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/number-identification" element={<NumberIdentificationPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/activity-report" element={<ActivityReportPage />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <InnerApp />
    </I18nProvider>
  );
}
