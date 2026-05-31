import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WebcamRecorder from "../components/WebcamRecorder";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useTranslation } from "../i18n";

import {
  generateQuestion,
  predictNumber,
  validateActivityAnswer,
} from "../services/api";

const ACTIVITY_REPORT_KEY = "activity-performance-report";

function readReportEntries() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_REPORT_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeReportEntry(entry) {
  const current = readReportEntries();
  localStorage.setItem(ACTIVITY_REPORT_KEY, JSON.stringify([entry, ...current]));
}

export default function ActivityPage({ operation, title, icon }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [livePrediction, setLivePrediction] = useState("--");
  const [result, setResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRequestInFlight = useRef(false);

  const loadProblem = async () => {
    setError("");
    setResult(null);
    const data = await generateQuestion(operation);
    setProblem(data);
  };

  useEffect(() => {
    loadProblem().catch((err) => setError(err.message));
  }, [operation]);

  /**
   * FIX: video-based prediction (not frame streaming)
   */
  const handleVideo = useCallback(async (videoBase64) => {
    setLoading(true);
    setError("");
    setLivePrediction("--");

    try {
      const data = await predictNumber(videoBase64);

      setLivePrediction(String(data.predicted_number));
    } catch (err) {
      if (err.message !== "No hand landmarks detected in the video") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * FIXED backend payload
   */
  const submitLiveAnswer = async () => {
    if (!problem || livePrediction === "--") return;

    setLoading(true);
    setError("");

    try {
      const evaluation = await validateActivityAnswer({
        operation,
        left: problem.left,
        right: problem.right,
        predicted_number: Number(livePrediction), // ✅ FIXED
      });

      setResult(evaluation);

      writeReportEntry({
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        operation,
        title,
        question: `${problem.left} ${problem.operator} ${problem.right} = ?`,
        correctAnswer: evaluation.expected_answer,
        submittedAnswer: livePrediction,
        isCorrect: Boolean(evaluation.is_correct),
        points: evaluation.is_correct ? 1 : 0,
        createdAt: new Date().toISOString(),
      });

      setScore((prev) => ({
        correct: prev.correct + (evaluation.is_correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">

      {/* Question Card */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {(() => {
                const IconComp = icon || Brain;
                return <IconComp className="h-5 w-5 text-violet-600" />;
              })()}
              {title}
            </CardTitle>
          </CardHeader>

        <CardContent>
          {problem && (
            <h3 className="text-center text-3xl font-semibold bg-slate-50 p-4 rounded-lg">
              {problem.left} {problem.operator} {problem.right} = ?
            </h3>
          )}
        </CardContent>
      </Card>

      {/* MAIN LAYOUT */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* CAMERA */}
        <WebcamRecorder onVideoCapture={handleVideo} />

        {/* RESULT PANEL */}
        <Card className="flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
          <CardContent className="text-center">

            {loading ? (
              <p className="text-lg animate-pulse">{t("activity.processing")}</p>
            ) : (
              <>
                <p className="text-sm opacity-80">{t("activity.predicted")}</p>
                <div className="text-7xl font-bold">{livePrediction}</div>

                <p className="mt-3 text-sm">
                  {t("activity.score")} : {score.correct}/{score.total}
                </p>

                <Button
                  className="mt-4"
                  onClick={submitLiveAnswer}
                  disabled={livePrediction === "--" || loading}
                >
                  {t("activity.submit")}
                </Button>
              </>
            )}

          </CardContent>
        </Card>
      </div>

      {/* RESULT */}
      {result && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p>{t("activity.recognized")} : {result.predicted_answer}</p>
            <p>{t("activity.expected")} : {result.expected_answer}</p>
            <p className={result.is_correct ? "text-green-600" : "text-red-600"}>
              {result.is_correct ? t("activity.correct") : t("activity.wrong")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ERROR */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* NEXT */}
      <Button
        variant="secondary"
        onClick={() => loadProblem().catch(setError)}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        {t("activity.next")}
      </Button>

      <Button
        variant="outline"
        onClick={() => navigate("/activity-report")}
      >
        {t("activity.report") || "View report"}
      </Button>
    </section>
  );
}