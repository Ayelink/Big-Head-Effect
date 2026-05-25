import { useState, useRef, useCallback } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { detectHead, renderBigHeadEffect } from "@/lib/bighead-engine";
import { Slider } from "@/components/ui/slider";

type ProcessState = "idle" | "loading" | "processing" | "done" | "error";

interface DetectionData {
  headBox: { x: number; y: number; width: number; height: number };
  imageWidth: number;
  imageHeight: number;
}

const Index = () => {
  const [state, setState] = useState<ProcessState>("idle");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [headScale, setHeadScale] = useState(2.2);
  const [errorMsg, setErrorMsg] = useState("");

  const imgRef = useRef<HTMLImageElement | null>(null);
  const detectionRef = useRef<DetectionData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setState("loading");
    setErrorMsg("");

    const img = new Image();
    img.crossOrigin = "anonymous";

    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = async () => {
      imgRef.current = img;
      setState("processing");

      try {
        const detection = await detectHead(img);
        if (!detection) {
          setState("error");
          setErrorMsg("未检测到人脸，请换一张正面照片重试");
          return;
        }

        detectionRef.current = detection;
        applyEffect(img, detection, 2.2);
        setHeadScale(2.2);
        setState("done");
      } catch (err) {
        setState("error");
        setErrorMsg("处理失败：" + (err instanceof Error ? err.message : "未知错误"));
      }
    };

    img.onerror = () => {
      setState("error");
      setErrorMsg("图片加载失败，请重试");
    };
  }, []);

  const applyEffect = (
    img: HTMLImageElement,
    detection: DetectionData,
    scale: number
  ) => {
    const canvas = renderBigHeadEffect(img, detection, scale, 0.2);
    const dataUrl = canvas.toDataURL("image/png");
    setResultUrl(dataUrl);
  };

  const handleScaleChange = (value: number[]) => {
    const newScale = value[0];
    setHeadScale(newScale);
    if (imgRef.current && detectionRef.current) {
      applyEffect(imgRef.current, detectionRef.current, newScale);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  };

  const handleReset = () => {
    setState("idle");
    setResultUrl("");
    setHeadScale(2.2);
    detectionRef.current = null;
    imgRef.current = null;
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-6 pb-3 text-center">
        <h1 className="text-2xl font-bold text-foreground">大头矮人特效</h1>
        <p className="text-sm text-muted-foreground mt-1">
          上传照片，一键生成趣味大头效果
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-6">
        {state === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm">
            <div className="w-48 h-48 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <ImagePlus className="w-16 h-16 text-muted-foreground/40" />
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-base shadow-sm active:scale-95 transition-transform"
              >
                <ImagePlus className="w-5 h-5" />
                上传图片
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-secondary text-secondary-foreground font-medium text-base shadow-sm active:scale-95 transition-transform"
              >
                <Camera className="w-5 h-5" />
                拍照
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {(state === "loading" || state === "processing") && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <p className="text-base text-muted-foreground">
              {state === "loading" ? "加载图片中..." : "AI识别处理中..."}
            </p>
            <p className="text-xs text-muted-foreground/60">通常只需几秒</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-base text-destructive text-center">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="py-2 px-6 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              重新开始
            </button>
          </div>
        )}

        {state === "done" && resultUrl && (
          <div className="flex-1 flex flex-col items-center w-full max-w-sm gap-4 mt-2">
            {/* Result Image */}
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30">
              <img
                src={resultUrl}
                alt="大头矮人效果"
                className="max-w-full max-h-[55vh] object-contain"
              />
            </div>

            {/* Slider Control */}
            <div className="w-full space-y-2 bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">
                  头部放大
                </span>
                <span className="text-sm font-bold text-primary">
                  {headScale.toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[headScale]}
                onValueChange={handleScaleChange}
                min={1.0}
                max={5.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1.0x</span>
                <span>5.0x</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm active:scale-95 transition-transform"
              >
                换一张
              </button>
              <a
                href={resultUrl}
                download="bighead-effect.png"
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm text-center active:scale-95 transition-transform"
              >
                保存图片
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
