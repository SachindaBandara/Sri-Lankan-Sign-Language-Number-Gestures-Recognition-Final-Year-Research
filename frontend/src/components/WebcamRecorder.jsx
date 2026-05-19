import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

function getVideoMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const preferredTypes = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

const WebcamRecorder = forwardRef(function WebcamRecorder(
  {
    onFrameCapture,
    isStreaming,
    onToggleStreaming,
    buttonLabel = "Start Camera",
    className = "",
    intervalMs = 500,
  },
  ref
) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const [error, setError] = useState("");

  const captureFrame = () => {
    const videoElement = videoRef.current;
    const canvas = canvasRef.current;

    if (!videoElement || !canvas || videoElement.readyState < 2) {
      return null;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(videoElement, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const recordClip = (durationMs = 2500) => {
    if (!streamRef.current) {
      throw new Error("Camera is not ready.");
    }

    if (typeof MediaRecorder === "undefined") {
      throw new Error("Video recording is not supported in this browser.");
    }

    const mimeType = getVideoMimeType();

    return new Promise((resolve, reject) => {
      const chunks = [];
      let recorder;

      try {
        recorder = mimeType ? new MediaRecorder(streamRef.current, { mimeType }) : new MediaRecorder(streamRef.current);
      } catch (err) {
        reject(new Error(`Unable to start recording: ${err.message}`));
        return;
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => reject(new Error("Unable to record camera clip."));
      recorder.onstop = () => {
        const recordedType = recorder.mimeType || mimeType || "video/webm";
        const extension = recordedType.includes("mp4") ? ".mp4" : ".webm";
        resolve(new File(chunks, `gesture${extension}`, { type: recordedType }));
      };

      recorder.start();
      window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, durationMs);
    });
  };

  useImperativeHandle(ref, () => ({
    captureFrame,
    recordClip,
  }));

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
          videoRef.current.play().catch(() => {});
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
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isStreaming;
      });
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming || !videoRef.current || !onFrameCapture) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      const frameDataUrl = captureFrame();
      if (frameDataUrl) {
        onFrameCapture(frameDataUrl);
      }
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
            muted
            playsInline
            className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover shadow-sm"
          />
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
            <Camera className="h-3.5 w-3.5" />
            {isStreaming ? "Camera On" : "Camera Paused"}
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
});

export default WebcamRecorder;
