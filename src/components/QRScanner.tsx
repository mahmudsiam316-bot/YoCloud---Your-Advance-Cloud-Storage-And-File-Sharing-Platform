import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Camera, ImageIcon, Loader2, ZoomIn, ZoomOut, FlashlightOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScanResult: (data: string) => void;
}

export function QRScanner({ open, onClose, onScanResult }: QRScannerProps) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [processing, setProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanningRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const decodeFromCanvas = useCallback(async (canvas: HTMLCanvasElement): Promise<string | null> => {
    // Try native BarcodeDetector first
    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const results = await detector.detect(canvas);
        if (results.length > 0) return results[0].rawValue;
      } catch {}
    }

    // Fallback to html5-qrcode
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scannerId = "qr-scan-" + Date.now();
      const div = document.createElement("div");
      div.id = scannerId;
      div.style.display = "none";
      document.body.appendChild(div);
      const scanner = new Html5Qrcode(scannerId);
      try {
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );
        const file = new File([blob], "frame.png", { type: "image/png" });
        const result = await scanner.scanFileV2(file, false);
        return result?.decodedText || null;
      } finally {
        try { scanner.clear(); } catch {}
        div.remove();
      }
    } catch {
      return null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        scanningRef.current = true;

        // Continuous scan loop
        let lastScanTime = 0;
        const scanLoop = async () => {
          if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
          
          const now = Date.now();
          if (now - lastScanTime > 300) {
            lastScanTime = now;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (video.videoWidth > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(video, 0, 0);
                const result = await decodeFromCanvas(canvas);
                if (result && scanningRef.current) {
                  scanningRef.current = false;
                  stopCamera();
                  onScanResult(result);
                  return;
                }
              }
            }
          }
          
          if (scanningRef.current) {
            rafRef.current = requestAnimationFrame(scanLoop);
          }
        };
        rafRef.current = requestAnimationFrame(scanLoop);
      }
    } catch {
      toast.error("ক্যামেরা অ্যাক্সেস দিতে হবে। QR ইমেজ আপলোড করুন।");
      setMode("upload");
    }
  }, [onScanResult, stopCamera, decodeFromCanvas]);

  useEffect(() => {
    if (open && mode === "camera") {
      startCamera();
    }
    return () => stopCamera();
  }, [open, mode, startCamera, stopCamera]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const result = await decodeFromCanvas(canvas);
      if (result) {
        onScanResult(result);
      } else {
        toast.error("এই ছবিতে কোনো QR কোড পাওয়া যায়নি");
      }
    } catch {
      toast.error("QR কোড ডিটেক্ট করতে পারেনি");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
      >
        {/* Camera view - Full screen */}
        {mode === "camera" ? (
          <>
            {/* Video fills entire screen */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Dark overlay with transparent center cutout */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              {/* Top overlay */}
              <div className="absolute top-0 left-0 right-0 h-[calc(50%-140px)] bg-black/60" />
              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-[calc(50%-140px)] bg-black/60" />
              {/* Left overlay */}
              <div className="absolute top-[calc(50%-140px)] left-0 w-[calc(50%-140px)] h-[280px] bg-black/60" />
              {/* Right overlay */}
              <div className="absolute top-[calc(50%-140px)] right-0 w-[calc(50%-140px)] h-[280px] bg-black/60" />
            </div>

            {/* Scan frame corners */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="relative w-[280px] h-[280px]">
                {/* Corner brackets - cyan/teal colored like reference */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-[3px] border-l-[3px] border-sky-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-[3px] border-r-[3px] border-sky-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-[3px] border-l-[3px] border-sky-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-[3px] border-r-[3px] border-sky-400 rounded-br-lg" />

                {/* Scanning line */}
                <motion.div
                  animate={{ y: [0, 268, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-1 right-1 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                />
              </div>
            </div>

            {/* Top bar with controls */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-3 pb-2">
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { stopCamera(); setMode("upload"); }}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                >
                  <ImageIcon className="w-5 h-5 text-white" />
                </button>
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-50">
                  <FlashlightOff className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Bottom instruction */}
            <div className="absolute bottom-0 left-0 right-0 z-30 pb-8 pt-4 flex flex-col items-center gap-4">
              {!cameraReady && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <p className="text-white/80 text-sm">Starting camera...</p>
                </div>
              )}
              {cameraReady && (
                <p className="text-white/70 text-sm font-medium">
                  QR কোডটি ফ্রেমের মধ্যে রাখুন
                </p>
              )}

              {/* Zoom controls */}
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
                <ZoomOut className="w-4 h-4 text-white/60" />
                <div className="w-32 h-1 bg-white/20 rounded-full relative">
                  <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
                </div>
                <ZoomIn className="w-4 h-4 text-white/60" />
              </div>
            </div>
          </>
        ) : (
          /* Upload mode */
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-black z-10">
              <button
                onClick={() => setMode("camera")}
                className="text-white/70 text-sm font-medium flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Camera
              </button>
              <h2 className="text-white font-semibold text-base">Upload QR</h2>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center bg-black">
              <div className="flex flex-col items-center gap-6 px-8">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-36 h-36 rounded-3xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center"
                >
                  {processing ? (
                    <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-white/30" />
                  )}
                </motion.div>
                <div className="text-center">
                  <p className="text-white font-semibold text-lg mb-1">QR ছবি আপলোড করুন</p>
                  <p className="text-white/40 text-sm">গ্যালারি থেকে QR কোড সিলেক্ট করুন</p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                  size="lg"
                  className="px-10 rounded-full bg-sky-500 hover:bg-sky-600 text-white"
                >
                  {processing ? "Processing..." : "Choose Image"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
