import { useCallback, useState } from "react";
import WebcamRecorder from "../components/WebcamRecorder";
import { predictNumber } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Sparkles, Activity } from "lucide-react";

export default function NumberIdentificationPage() {
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [modelKey, setModelKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVideo = useCallback(async (videoBase64) => {
    setLoading(true);
    setError("");

    // reset old result immediately
    setPrediction(null);
    setConfidence(null);
    setModelKey(null);

    try {
      const data = await predictNumber(videoBase64);

      setPrediction(data.predicted_number);
      setConfidence(Math.round((data.confidence || 0) * 100));
      setModelKey(data.model_key);

    } catch (err) {
      setError(
        err.message === "No hand landmarks detected in the video"
          ? "No hand detected during recording"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="space-y-6">

      {/* header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles />
            Sign Number Recognition (3 seconds)
          </CardTitle>
          <p className="text-sm text-gray-500">
            Show dynamic sign gesture for 3 seconds
          </p>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">

        <WebcamRecorder onVideoCapture={handleVideo} />

        <Card className="flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardContent className="text-center">

            {loading ? (
              <>
                <Activity className="animate-spin mx-auto mb-2" />
                <p>Processing gesture...</p>
              </>
            ) : (
              <>
                <div className="text-sm opacity-80">Predicted Number</div>
                <div className="text-7xl font-bold">
                  {prediction ?? "--"}
                </div>

                {prediction !== null && (
                  <div className="mt-4 text-sm space-x-2">
                    <span>Confidence: {confidence}%</span>
                    <span>Model: {modelKey}</span>
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