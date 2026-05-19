import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import WebcamRecorder from "../components/WebcamRecorder";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { validateNumber } from "../services/api";

export default function NumberIdentificationPage() {
  const webcamRef = useRef(null);
  const [prediction, setPrediction] = useState("--");
  const [result, setResult] = useState(null);
  const [expectedNumber, setExpectedNumber] = useState("");
  const [modelKey, setModelKey] = useState("auto");
  const [isStreaming, setIsStreaming] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleValidate = async () => {
    if (!webcamRef.current) {
      setError("Camera is not ready yet.");
      return;
    }

    const parsedExpectedNumber = Number(expectedNumber);
    if (expectedNumber === "" || Number.isNaN(parsedExpectedNumber)) {
      setError("Expected number is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const videoFile = await webcamRef.current.recordClip(2500);
      const data = await validateNumber({
        videoFile,
        expectedNumber: parsedExpectedNumber,
        modelKey,
      });
      setPrediction(String(data.predicted_number));
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <Card className="border-slate-200 bg-white">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Number Identification
          </CardTitle>
          <p className="text-sm text-slate-500">Record a short gesture clip, choose the model range, and validate the predicted number.</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Expected Number</p>
            <input
              type="number"
              min="0"
              max="50"
              value={expectedNumber}
              onChange={(event) => setExpectedNumber(event.target.value)}
              placeholder="Enter the number you signed"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Number Range Model</p>
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
          <div className="flex items-end">
            <Button className="w-full" onClick={handleValidate} disabled={isSubmitting || expectedNumber === ""}>
              {isSubmitting ? "Validating..." : "Capture & Validate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <WebcamRecorder
          ref={webcamRef}
          isStreaming={isStreaming}
          onToggleStreaming={() => setIsStreaming((prev) => !prev)}
          buttonLabel={isStreaming ? "Pause Camera" : "Resume Camera"}
        />

        <Card className="flex min-h-[220px] items-center justify-center border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
          <CardContent className="w-full py-8">
            <div className="mb-2 text-center text-sm text-blue-100">Identified Number</div>
            <div className="text-center text-6xl font-extrabold tracking-tight sm:text-7xl">{prediction}</div>
            {result && (
              <div className="mt-4 space-y-1 text-center text-sm text-blue-100">
                <p>Expected: {expectedNumber}</p>
                <p className={result.correct ? "font-semibold text-emerald-200" : "font-semibold text-amber-200"}>
                  {result.correct ? "Correct" : "Incorrect"}
                </p>
              </div>
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
