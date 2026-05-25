import { useState, useRef, useCallback } from "react";
import { Camera, ImagePlus, Loader2, Download, RefreshCw, Sparkles } from "lucide-react";
import { useResourceUpload } from "@/hooks/useResourceUpload";
import { useAIImage } from "@/hooks/useAIImage";
import { Slider } from "@/components/ui/slider";

type AppState = "idle" | "uploading" | "generating" | "done" | "error";

interface HistoryItem {
  url: string;
  label: string;
}

function buildPrompt(scale: number): string {
  const bodyRatio = Math.round((1 - (scale - 1) * 0.15) * 100);
  return `Transform this photo into a "big head small body" caricature effect:
- Enlarge the person's head to approximately ${scale}x its original size
- Shrink the body to about ${bodyRatio}% of its original height
- Keep the face details, expression, and features clear and recognizable
- Maintain the original background and clothing
- The result should look like a cute, funny bobblehead or chibi-style caricature
- Keep the person's feet at the same position, compress the body from top
- The enlarged head should be seamlessly connected to the smaller body`;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultImageUrl, setResultImageUrl] = useState<string>("");
  const [headScale, setHeadScale] = useState(2.0);
  const [historyImages, setHistoryImages] = useState<HistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const lastResourcePathRef = useRef<string | null>(null);
  const originalPreviewRef = useRef<string | null>(null);

  const { previewUrl, uploadFile, reset: resetUpload } = useResourceUpload();
  const { isLoading, submitAndPoll, clearImages } = useAIImage();

  const generateWithScale = useCallback(async (resourcePath: string, scale: number, isFirst: boolean) => {
    setAppState("generating");
    setResultImageUrl("");

    const result = await submitAndPoll({
      model: "google/gemini-3.1-flash-image-preview",
      prompt: buildPrompt(scale),
      type: "img_2_img",
      resource_path: resourcePath,
      ratio: "3:4",
      resolution: "1k",
      format: "png",
    });

    if (result && result.length > 0) {
      const newUrl = result[0].url;
      setResultImageUrl(newUrl);
      setHistoryImages((prev) => {
        const newItem: HistoryItem = { url: newUrl, label: `${scale.toFixed(1)}x` };
        const next = [...prev, newItem];
        setSelectedIndex(next.length - 1);
        return next;
      });
      setAppState("done");
    } else {
      setAppState("error");
      setErrorMsg("AI生成失败，请更换照片重试");
    }
  }, [submitAndPoll]);

  const processImage = useCallback(async (file: File) => {
    setAppState("uploading");
    setErrorMsg("");
    setResultImageUrl("");
    setHistoryImages([]);
    setSelectedIndex(0);

    const resourcePath = await uploadFile(file);
    if (!resourcePath) {
      setAppState("error");
      setErrorMsg("图片上传失败，请重试");
      return;
    }

    // Store original preview
    const originalUrl = URL.createObjectURL(file);
    originalPreviewRef.current = originalUrl;
    setHistoryImages([{ url: originalUrl, label: "原图" }]);

    lastResourcePathRef.current = resourcePath;
    await generateWithScale(resourcePath, headScale, true);
  }, [uploadFile, generateWithScale, headScale]);

  const handleRegenerate = useCallback(() => {
    if (lastResourcePathRef.current) {
      generateWithScale(lastResourcePathRef.current, headScale, false);
    }
  }, [generateWithScale, headScale]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  };

  const handleReset = () => {
    setAppState("idle");
    setResultImageUrl("");
    setErrorMsg("");
    setHeadScale(2.0);
    setHistoryImages([]);
    setSelectedIndex(0);
    lastResourcePathRef.current = null;
    originalPreviewRef.current = null;
    resetUpload();
    clearImages();
  };

  const handleSelectHistory = (index: number) => {
    setSelectedIndex(index);
    setResultImageUrl(historyImages[index].url);
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-6 pb-3 text-center">
        <h1 className="text-2xl font-bold text-foreground">大头矮人特效</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI 一键生成趣味大头娃娃效果
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-6">
        {appState === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm">
            <div className="w-48 h-48 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <ImagePlus className="w-16 h-16 text-muted-foreground/40" />
            </div>

            {/* Head Scale Slider */}
            <div className="w-full space-y-2 bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">头部放大比例</span>
                <span className="text-sm font-bold text-primary">{headScale.toFixed(1)}x</span>
              </div>
              <Slider
                value={[headScale]}
                onValueChange={(v) => setHeadScale(v[0])}
                min={1.0}
                max={4.0}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1.0x</span>
                <span>2.0x</span>
                <span>3.0x</span>
                <span>4.0x</span>
              </div>
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

            <p className="text-xs text-muted-foreground/60 text-center">
              支持 JPG、PNG、WebP 格式，最大 10MB
            </p>

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

        {(appState === "uploading" || appState === "generating") && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            {previewUrl && (
              <div className="w-40 h-40 rounded-xl overflow-hidden border border-border shadow-sm">
                <img
                  src={previewUrl}
                  alt="原图预览"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-base font-medium text-foreground">
                {appState === "uploading" ? "上传中..." : "AI 正在生成大头效果..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {appState === "uploading" ? "正在上传图片" : "通常需要 10-30 秒，请耐心等待"}
              </p>
            </div>
          </div>
        )}

        {appState === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-base text-destructive text-center px-4">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="py-2.5 px-6 rounded-xl bg-primary text-primary-foreground font-medium active:scale-95 transition-transform"
            >
              重新开始
            </button>
          </div>
        )}

        {appState === "done" && resultImageUrl && (
          <div className="flex-1 flex flex-col w-full max-w-md gap-4 mt-2">
            {/* Image area with history sidebar */}
            <div className="flex-1 flex gap-3 min-h-0">
              {/* Left: History thumbnails */}
              <div className="flex-shrink-0 w-16 overflow-y-auto space-y-2 pr-1">
                {historyImages.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectHistory(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      idx === selectedIndex
                        ? "border-primary shadow-sm"
                        : "border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                    <span className="sr-only">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Right: Main preview */}
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm">
                <img
                  src={resultImageUrl}
                  alt="大头矮人效果"
                  crossOrigin="anonymous"
                  className="max-w-full max-h-[50vh] object-contain"
                />
              </div>
            </div>

            {/* Slider Control */}
            <div className="w-full space-y-2 bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">头部放大比例</span>
                <span className="text-sm font-bold text-primary">{headScale.toFixed(1)}x</span>
              </div>
              <Slider
                value={[headScale]}
                onValueChange={(v) => setHeadScale(v[0])}
                min={1.0}
                max={4.0}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1.0x</span>
                <span>2.0x</span>
                <span>3.0x</span>
                <span>4.0x</span>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                重新生成
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm active:scale-95 transition-transform"
              >
                <RefreshCw className="w-4 h-4" />
                换一张
              </button>
              <a
                href={resultImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-transform"
              >
                <Download className="w-4 h-4" />
                查看大图
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
