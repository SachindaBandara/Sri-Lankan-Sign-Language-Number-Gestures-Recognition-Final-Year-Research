import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import WebcamRecorder from "../components/WebcamRecorder";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { generateQuestion, validateActivityAnswer } from "../services/api";

export default function ActivityPage({ operation, title }) {
  const webcamRef = useRef(null);
  const [problem, setProblem] = useState(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadProblem = useCallback(async () => {
    setError("");
    setResult(null);
    const data = await generateQuestion(operation);
    setProblem(data);
  }, [operation]);

  useEffect(() => {
    loadProblem().catch((err) => setError(err.message));
  }, [loadProblem]);

  const submitLiveAnswer = async () => {
    if (!problem || !webcamRef.current) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const frame = webcamRef.current.captureFrame();
      if (!frame) {
        throw new Error("Camera frame is not ready yet.");
      }

      const evaluation = await validateActivityAnswer({
        operation,
        left: problem.left,
        right: problem.right,
        frame,
      });
      setResult(evaluation);
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
    <section className="space-y-4 sm:space-y-6">
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Brain className="h-5 w-5 text-violet-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {problem && (
            <h3 className="rounded-lg bg-slate-50 p-4 text-center text-2xl font-semibold sm:text-3xl">
              {problem.left} {problem.operator} {problem.right} = ?
            </h3>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <WebcamRecorder
          ref={webcamRef}
          isStreaming={isStreaming}
          onToggleStreaming={() => setIsStreaming((prev) => !prev)}
          buttonLabel={isStreaming ? "Pause Camera" : "Resume Camera"}
        />
        <Card className="border-slate-200 bg-white">
          <CardContent className="space-y-4 py-5 sm:py-6">
            <p className="text-sm text-slate-500">Submit the current camera frame to validate your answer.</p>
            <p className="text-sm text-slate-500">
              Score: {score.correct}/{score.total}
            </p>
            <Button onClick={submitLiveAnswer} disabled={loading || !problem}>
              {loading ? "Checking..." : "Check Answer"}
            </Button>
          </CardContent>
        </Card>
        {result && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="space-y-2 py-5 sm:py-6">
              <p className="text-sm text-slate-500">Result</p>
              <p>Recognized Answer: {result.predicted_answer}</p>
              <p>Expected Answer: {result.expected_answer}</p>
              <p className={result.is_correct ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                {result.is_correct ? "Correct!" : "Try Again"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Button
        className="w-full gap-2 sm:w-auto"
        variant="secondary"
        onClick={() => loadProblem().catch((err) => setError(err.message))}
      >
        <RefreshCw className="h-4 w-4" />
        Next Problem
      </Button>
      {loading && <p className="text-sm text-slate-500">Checking answer...</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
