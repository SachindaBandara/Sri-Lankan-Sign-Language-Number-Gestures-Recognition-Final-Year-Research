import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Circle, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { useTranslation } from "../i18n";

const RECORD_DURATION_MS = 3000; // ✔ backend aligned

export default function WebcamRecorder({ onVideoCapture, className = "" }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const countdownRef = useRef(null);
  const timeoutRef = useRef(null);

  const [error, setError] = useState("");
  const [state, setState] = useState("idle");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current || state !== "idle") return;

    setError("");
    setState("recording");

    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      setState("processing");

      const blob = new Blob(chunksRef.current, { type: mimeType });

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        onVideoCapture?.(base64);

        setState("idle");
        setCountdown(0);
      };

      reader.readAsDataURL(blob);
    };

    recorder.start(100);

    // countdown
    let time = RECORD_DURATION_MS / 1000;
    setCountdown(time);

    countdownRef.current = setInterval(() => {
      time -= 1;
      setCountdown(time);
      if (time <= 0) clearInterval(countdownRef.current);
    }, 1000);

    // auto stop
    timeoutRef.current = setTimeout(() => {
      recorder.stop();
    }, RECORD_DURATION_MS);
  }, [state, onVideoCapture]);

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      <CardContent className="p-5 space-y-5">
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {t("recorder.heading")}
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            {t("recorder.subtitle")}
          </h2>
          <p className="text-sm text-slate-500">
            {t("recorder.help")}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-[4/3] w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-600/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              {t("recorder.live_preview")}
            </div>

            {state === "recording" && (
              <div className="flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-red-500/30">
                <Circle className="h-2.5 w-2.5 fill-white text-white" />
                {t("recorder.record_left", { count: countdown })}
              </div>
            )}
          </div>

          {state === "recording" && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-red-500/60 ring-inset" />
          )}
        </div>

        <div className="flex justify-center gap-3">
          {state !== "recording" ? (
            <Button onClick={startRecording} className="min-w-40">
              <Camera className="w-4 h-4 mr-2" />
              {t("number.record")}
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopRecording} className="min-w-40">
              <Square className="w-4 h-4 mr-2" />
              {t("number.stop")}
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}