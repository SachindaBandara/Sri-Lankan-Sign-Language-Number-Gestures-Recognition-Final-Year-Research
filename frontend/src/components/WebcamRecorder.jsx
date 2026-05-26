import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Circle, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

const RECORD_DURATION_MS = 5000;

export default function WebcamRecorder({
  onVideoCapture,
  className = "",
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const countdownRef = useRef(null);

  const [error, setError] = useState("");
  const [recorderState, setRecorderState] = useState("idle"); // "idle" | "recording" | "processing"
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setError(`Camera error: ${err.message}`);
      }
    }
    initCamera();

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current || recorderState !== "idle") return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setRecorderState("processing");
      const blob = new Blob(chunksRef.current, { type: mimeType });

      // Convert blob → base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result; // data:<mime>;base64,<data>
        onVideoCapture?.(base64);
        setRecorderState("idle");
        setCountdown(0);
      };
      reader.readAsDataURL(blob);
    };

    recorder.start(100); // collect data every 100 ms
    setRecorderState("recording");

    // Countdown ticker
    const totalSeconds = RECORD_DURATION_MS / 1000;
    setCountdown(totalSeconds);
    let remaining = totalSeconds;

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 1000);

    // Auto-stop after duration
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, RECORD_DURATION_MS);
  }, [recorderState, onVideoCapture]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const isRecording = recorderState === "recording";
  const isProcessing = recorderState === "processing";

  return (
    <Card className={`w-full ${className}`.trim()}>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Video preview */}
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover shadow-sm"
          />

          {/* Status badge */}
          <div
            className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors ${
              isRecording
                ? "bg-red-600/80"
                : isProcessing
                ? "bg-amber-500/80"
                : "bg-black/60"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            {isRecording ? "Recording" : isProcessing ? "Processing…" : "Ready"}
          </div>

          {/* Countdown overlay */}
          {isRecording && countdown > 0 && (
            <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-base font-bold text-white tabular-nums">
              {countdown}
            </div>
          )}

          {/* Recording ring pulse */}
          {isRecording && (
            <span className="absolute inset-0 rounded-lg ring-4 ring-red-500 ring-offset-0 animate-pulse pointer-events-none" />
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <Button
              className="w-full sm:w-auto gap-2"
              onClick={startRecording}
              disabled={!!error || isProcessing}
            >
              <Circle className="h-3.5 w-3.5 fill-red-500 text-red-500" />
              {isProcessing ? "Processing…" : "Record 5 s"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full sm:w-auto gap-2"
              onClick={stopRecording}
            >
              <Square className="h-3.5 w-3.5 fill-white" />
              Stop Early
            </Button>
          )}

          {isRecording && (
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-1000"
                  style={{
                    width: `${((RECORD_DURATION_MS / 1000 - countdown) / (RECORD_DURATION_MS / 1000)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}