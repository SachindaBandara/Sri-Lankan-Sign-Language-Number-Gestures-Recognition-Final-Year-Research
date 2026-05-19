import { Calculator, Hand, Home } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import ActivitiesPage from "./pages/ActivitiesPage";
import HomePage from "./pages/HomePage";
import NumberIdentificationPage from "./pages/NumberIdentificationPage";
import { Card, CardContent } from "./components/ui/card";
import { cn } from "./lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/number-identification", label: "Number Identification", icon: Hand },
  { path: "/activities", label: "Activities", icon: Calculator },
];

export default function App() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <Card className="mb-5 border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl">
        <CardContent className="space-y-2 py-6 sm:py-7">
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Sign Language Number Learning App</h1>
          <p className="text-sm text-blue-100 sm:text-base">Real-time number recognition and arithmetic practice with hand gestures.</p>
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
      </Routes>
    </main>
  );
}
