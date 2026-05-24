import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

export default function WebcamRecorder({
  onFrameCapture,
  isStreaming,
  onToggleStreaming,
  buttonLabel = "Start Camera",
  className = "",
  intervalMs = 500,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError(`Camera error: ${err.message}`);
      }
    }

    initCamera();
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isStreaming || !videoRef.current || !onFrameCapture) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    timerRef.current = window.setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      canvas.width = 640;
      canvas.height = 480;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frameDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onFrameCapture(frameDataUrl);
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isStreaming, onFrameCapture, intervalMs]);

  return (
    <Card className={`w-full ${className}`.trim()}>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover shadow-sm"
          />
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
            <Camera className="h-3.5 w-3.5" />
            {isStreaming ? "Streaming" : "Ready"}
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button className="w-full sm:w-auto" onClick={onToggleStreaming} disabled={!!error}>
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
