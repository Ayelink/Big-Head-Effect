import { useState, useRef, useCallback } from "react";
import { Camera, ImagePlus, Loader2, Download, RefreshCw } from "lucide-react";
import { useResourceUpload } from "@/hooks/useResourceUpload";
import { useAIImage } from "@/hooks/useAIImage";

type AppState = "idle" | "uploading" | "generating" | "done" | "error";

const BIGHEAD_PROMPT = `Transform this photo into a "big head small body" caricature effect:
- Enlarge the person's head to approximately 2.2x its original size
- Shrink the body to about 60-70% of its original height
- Keep the face details, expression, and features clear and recognizable
- Maintain the original background and clothing
- The result should look like a cute, funny bobblehead or chibi-style caricature
- Keep the person's feet at the same position, compress the body from top
- The enlarged head should be seamlessly connected to the smaller body`;

const Index = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultImageUrl, setResultImageUrl] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { previewUrl, uploadFile, reset: resetUpload } = useResourceUpload();
  const { isLoading, submitAndPoll, clearImages } = useAIImage();

  const processImage = useCallback(async (file: File) => {
    setAppState("uploading");
    setErrorMsg("");
    setResultImageUrl("");

    // Step 1: Upload image
    const resourcePath = await uploadFile(file);
    if (!resourcePath) {
      setAppState("error");
      setErrorMsg("图片上传失败，请重试");
      return;
    }

    // Step 2: Call AI to generate big head effect
    setAppState("generating");

    const result = await submitAndPoll({
      model: "google/gemini-3.1-flash-image-preview",
      prompt: BIGHEAD_PROMPT,
      type: "img_2_img",
      resource_path: resourcePath,
      ratio: "3:4",
      resolution: "1k",
      format: "png",
    });

    if (result && result.length > 0) {
      setResultImageUrl(result[0].url);
      setAppState("done");
    } else {
      setAppState("error");
      setErrorMsg("AI生成失败，请更换照片重试");
    }
  }, [uploadFile, submitAndPoll]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  };

  const handleReset = () => {
    setAppState("idle");
    setResultImageUrl("");
    setErrorMsg("");
    resetUpload();
    clearImages();
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
            {/* Preview of original image */}
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
          <div className="flex-1 flex flex-col items-center w-full max-w-sm gap-4 mt-2">
            {/* Result Image */}
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm">
              <img
                src={resultImageUrl}
                alt="大头矮人效果"
                crossOrigin="anonymous"
                className="max-w-full max-h-[60vh] object-contain"
              />
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
