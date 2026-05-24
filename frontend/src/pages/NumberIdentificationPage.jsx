import { useCallback, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import WebcamRecorder from "../components/WebcamRecorder";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";
import { predictNumber } from "../services/api";

export default function NumberIdentificationPage() {
  const [prediction, setPrediction] = useState("--");
  const [modelKey, setModelKey] = useState("auto");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const isRequestInFlightRef = useRef(false);

  const handleFrame = useCallback(
    async (frameDataUrl) => {
      if (isRequestInFlightRef.current) return;
      isRequestInFlightRef.current = true;

      try {
        const data = await predictNumber(frameDataUrl, modelKey);
        setPrediction(String(data.predicted_number));
        setError("");
      } catch (err) {
        if (err.message !== "No hand landmarks detected") {
          setError(err.message);
        }
      }
      isRequestInFlightRef.current = false;
    },
    [modelKey]
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      <Card className="border-slate-200 bg-white">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Number Identification
          </CardTitle>
          <p className="text-sm text-slate-500">Record your gesture and get the detected number instantly.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full max-w-xs">
            <p className="mb-2 text-sm text-slate-500">Number Range Model</p>
            <Select value={modelKey} onValueChange={setModelKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Recommended)</SelectItem>
                <SelectItem value="0-9">0-9</SelectItem>
                <SelectItem value="10-19">10-19</SelectItem>
                <SelectItem value="20-29">20-29</SelectItem>
                <SelectItem value="30-39">30-39</SelectItem>
                <SelectItem value="40-50">40-50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <WebcamRecorder
          onFrameCapture={handleFrame}
          isStreaming={isStreaming}
          onToggleStreaming={() => setIsStreaming((prev) => !prev)}
          buttonLabel={isStreaming ? "Stop Prediction" : "Start Real-time Prediction"}
        />

        <Card className="flex min-h-[220px] items-center justify-center border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
          <CardContent className="w-full py-8">
            <div className="mb-2 text-center text-sm text-blue-100">Identified Number</div>
            <div className="text-center text-6xl font-extrabold tracking-tight sm:text-7xl">{prediction}</div>
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
