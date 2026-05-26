import { useCallback, useState } from "react";
import { Sparkles, Activity } from "lucide-react";
import WebcamRecorder from "../components/WebcamRecorder";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { predictNumber } from "../services/api";

export default function NumberIdentificationPage() {
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [modelKey, setModelKey] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVideo = useCallback(async (videoBase64) => {
    setIsLoading(true);
    setError("");

    try {
      const data = await predictNumber(videoBase64);
      setPrediction(String(data.predicted_number));
      setConfidence(data.confidence != null ? Math.round(data.confidence * 100) : null);
      setModelKey(data.model_key ?? null);
    } catch (err) {
      if (err.message !== "No hand landmarks detected in the video") {
        setError(err.message);
      } else {
        setError("No hand detected — make sure your hand is visible throughout the recording.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header card */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Number Identification
          </CardTitle>
          <p className="text-sm text-slate-500">
            Record a 5-second gesture — all models are evaluated automatically and the most confident result is shown.
          </p>
        </CardHeader>
      </Card>

      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WebcamRecorder onVideoCapture={handleVideo} />

        {/* Result card */}
        <Card className="flex min-h-[240px] flex-col items-center justify-center border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
          <CardContent className="w-full py-8">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Activity className="h-8 w-8 animate-pulse text-blue-200" />
                <p className="text-sm text-blue-200">Analysing gesture…</p>
              </div>
            ) : (
              <>
                <div className="mb-1 text-center text-sm font-medium tracking-wide text-blue-200 uppercase">
                  Identified Number
                </div>
                <div className="text-center text-7xl font-extrabold tracking-tight sm:text-8xl">
                  {prediction ?? "--"}
                </div>

                {/* Confidence + model badge — shown only after a successful prediction */}
                {prediction !== null && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-blue-100">
                    {confidence !== null && (
                      <span className="rounded-full bg-white/15 px-3 py-1">
                        Confidence: {confidence}%
                      </span>
                    )}
                    {modelKey && (
                      <span className="rounded-full bg-white/15 px-3 py-1">
                        Model: {modelKey}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}