import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Circle, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

const RECORD_DURATION_MS = 3000; // ✔ backend aligned

export default function WebcamRecorder({ onVideoCapture, className = "" }) {
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
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4 space-y-4">

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-lg border aspect-[4/3] object-cover"
        />

        {/* status */}
        <div className="text-sm">
          Status: <b>{state}</b>
        </div>

        {state === "recording" && (
          <div className="text-red-500 font-bold">
            {countdown}s
          </div>
        )}

        <div className="flex gap-3">
          {state !== "recording" ? (
            <Button onClick={startRecording}>
              <Circle className="w-4 h-4 mr-2 text-red-500" />
              Record 3s
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopRecording}>
              <Square className="w-4 h-4 mr-2" />
              Stop
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