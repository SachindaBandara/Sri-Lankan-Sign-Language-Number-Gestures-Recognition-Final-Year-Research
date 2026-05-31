import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTranslation } from "../i18n";

const ACTIVITY_REPORT_KEY = "activity-performance-report";

function readReportEntries() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_REPORT_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function ActivityReportPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(readReportEntries());
  }, []);

  const summary = useMemo(() => {
    const total = entries.length;
    const correct = entries.filter((entry) => entry.isCorrect).length;
    const points = entries.reduce((sum, entry) => sum + (entry.points || 0), 0);

    return { total, correct, points };
  }, [entries]);

  const clearReport = () => {
    localStorage.removeItem(ACTIVITY_REPORT_KEY);
    setEntries([]);
  };

  return (
    <section className="space-y-6">
      <Card className="border-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white shadow-xl">
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BarChart3 className="h-6 w-6" />
            {t("report.title") || "Activity Performance Report"}
          </CardTitle>
          <p className="text-sm text-white/80">
            {t("report.subtitle") || "Track questions, answers, correctness, and points."}
          </p>
          <div className="absolute right-6 top-6 flex gap-2">
            <Button asChild variant="secondary">
              <Link to="/activities">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("report.back") || "Back"}
              </Link>
            </Button>
            <Button variant="outline" onClick={clearReport}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t("report.clear") || "Clear"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">{t("report.totalAttempts") || "Total attempts"}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">{t("report.correctAnswers") || "Correct answers"}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{summary.correct}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">{t("report.points") || "Points"}</p>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{summary.points}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("report.tableTitle") || "Performance details"}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">{t("report.empty") || "No activity attempts recorded yet."}</p>
          ) : (
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-semibold">{t("report.question") || "Question"}</th>
                  <th className="py-3 pr-4 font-semibold">{t("report.correctAnswer") || "Correct answer"}</th>
                  <th className="py-3 pr-4 font-semibold">{t("report.submittedAnswer") || "Submit answer"}</th>
                  <th className="py-3 pr-4 font-semibold">{t("report.result") || "Result"}</th>
                  <th className="py-3 pr-4 font-semibold">{t("report.points") || "Points"}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 align-top">
                    <td className="py-4 pr-4 font-medium text-slate-900">{entry.question}</td>
                    <td className="py-4 pr-4 text-slate-700">{entry.correctAnswer}</td>
                    <td className="py-4 pr-4 text-slate-700">{entry.submittedAnswer}</td>
                    <td className={entry.isCorrect ? "py-4 pr-4 font-semibold text-emerald-600" : "py-4 pr-4 font-semibold text-red-600"}>
                      {entry.isCorrect ? (t("activity.correct") || "Correct") : (t("activity.wrong") || "Incorrect")}
                    </td>
                    <td className="py-4 pr-4 font-semibold text-indigo-600">{entry.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}