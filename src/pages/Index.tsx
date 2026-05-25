import { useState, useRef, useCallback } from "react";
import { Camera, ImagePlus, Loader2, Download, RefreshCw, Sparkles, Globe, ChevronDown } from "lucide-react";
import { useResourceUpload } from "@/hooks/useResourceUpload";
import { useAIImage } from "@/hooks/useAIImage";
import { Slider } from "@/components/ui/slider";
import { type Locale, t } from "@/lib/i18n";
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
  const [locale, setLocale] = useState<Locale>("zh");
  const [langOpen, setLangOpen] = useState(false);
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
  const {
    previewUrl,
    uploadFile,
    reset: resetUpload
  } = useResourceUpload();
  const {
    isLoading,
    submitAndPoll,
    clearImages
  } = useAIImage();
  const generateWithScale = useCallback(async (resourcePath: string, scale: number) => {
    setAppState("generating");
    setResultImageUrl("");
    const result = await submitAndPoll({
      model: "google/gemini-3.1-flash-image-preview",
      prompt: buildPrompt(scale),
      type: "img_2_img",
      resource_path: resourcePath,
      ratio: "3:4",
      resolution: "1k",
      format: "png"
    });
    if (result && result.length > 0) {
      const newUrl = result[0].url;
      setResultImageUrl(newUrl);
      setHistoryImages(prev => {
        const newItem: HistoryItem = {
          url: newUrl,
          label: `${scale.toFixed(1)}x`
        };
        const next = [...prev, newItem];
        setSelectedIndex(next.length - 1);
        return next;
      });
      setAppState("done");
    } else {
      setAppState("error");
      setErrorMsg(t(locale, "generateFailed"));
    }
  }, [submitAndPoll, locale]);
  const processImage = useCallback(async (file: File) => {
    setAppState("uploading");
    setErrorMsg("");
    setResultImageUrl("");
    setHistoryImages([]);
    setSelectedIndex(0);
    const resourcePath = await uploadFile(file);
    if (!resourcePath) {
      setAppState("error");
      setErrorMsg(t(locale, "uploadFailed"));
      return;
    }
    const originalUrl = URL.createObjectURL(file);
    originalPreviewRef.current = originalUrl;
    setHistoryImages([{
      url: originalUrl,
      label: t(locale, "original")
    }]);
    lastResourcePathRef.current = resourcePath;
    await generateWithScale(resourcePath, headScale);
  }, [uploadFile, generateWithScale, headScale, locale]);
  const handleRegenerate = useCallback(() => {
    if (lastResourcePathRef.current) {
      generateWithScale(lastResourcePathRef.current, headScale);
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
  const toggleLang = (l: Locale) => {
    setLocale(l);
    setLangOpen(false);
  };
  return <div className="min-h-full flex flex-col bg-background font-sans">
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-5 pb-4 flex items-start justify-between">
        <div>
          <h1 className="font-medium tracking-[-0.66px] text-foreground text-[16px]">
            {t(locale, "title")}
          </h1>
          <p className="tracking-[-0.28px] text-muted-foreground mt-[8px] text-[12px]">
            {t(locale, "subtitle")}
          </p>
        </div>

        {/* Language Dropdown */}
        <div className="relative">
          <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1 text-[14px] text-foreground px-3 py-2 border border-border rounded-pill active:opacity-70 transition-opacity">
            <Globe className="w-4 h-4" />
            <span className="text-[12px]">{locale === "zh" ? "中文" : "EN"}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {langOpen && <>
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-pill overflow-hidden shadow-sm">
                <button onClick={() => toggleLang("zh")} className={`block w-full text-left px-4 py-2.5 text-[14px] tracking-[-0.28px] transition-colors ${locale === "zh" ? "font-medium bg-card" : "hover:bg-card"}`}>
                  中文
                </button>
                <button onClick={() => toggleLang("en")} className={`block w-full text-left px-4 py-2.5 text-[14px] tracking-[-0.28px] transition-colors ${locale === "en" ? "font-medium bg-card" : "hover:bg-card"}`}>
                  English
                </button>
              </div>
            </>}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-5 pb-5 gap-section overflow-hidden">
        {appState === "idle" && <div className="flex-1 flex flex-col justify-center gap-element">
            {/* Upload Area */}
            <div className="flex flex-col items-center py-10 border border-dashed border-light-pebble rounded-[8px]">
              <ImagePlus className="w-10 h-10 text-charcoal-gray mb-3" />
              <p className="text-[14px] text-muted-foreground tracking-[-0.28px]">
                {t(locale, "fileTip")}
              </p>
            </div>

            {/* Scale Slider */}
            <div className="bg-card p-card-pad space-y-element">
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-medium text-foreground tracking-[-0.28px]">
                  {t(locale, "scaleLabel")}
                </span>
                <span className="text-[21px] font-medium text-foreground tracking-[-0.5px]">
                  {headScale.toFixed(1)}x
                </span>
              </div>
              <Slider value={[headScale]} onValueChange={v => setHeadScale(v[0])} min={1.0} max={4.0} step={0.5} className="w-full" />
              <div className="flex justify-between text-[14px] text-muted-foreground tracking-[-0.28px]">
                <span>1.0x</span>
                <span>2.0x</span>
                <span>3.0x</span>
                <span>4.0x</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-element">
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 h-[48px] rounded-[8px] border border-foreground text-foreground font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity">
                <ImagePlus className="w-[18px] h-[18px]" />
                {t(locale, "uploadBtn")}
              </button>
              <button onClick={() => cameraInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 h-[48px] rounded-[8px] border border-foreground text-foreground font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity">
                <Camera className="w-[18px] h-[18px]" />
                {t(locale, "cameraBtn")}
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          </div>}

        {(appState === "uploading" || appState === "generating") && <div className="flex-1 flex flex-col items-center justify-center gap-element">
            {previewUrl && <div className="w-32 h-32 overflow-hidden border border-border">
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
              </div>}
            <Loader2 className="w-8 h-8 text-foreground animate-spin" />
            <p className="text-[21px] font-medium text-foreground tracking-[-0.5px] leading-[1.36]">
              {appState === "uploading" ? t(locale, "uploading") : t(locale, "generating")}
            </p>
            <p className="text-[14px] text-muted-foreground tracking-[-0.28px]">
              {appState === "uploading" ? t(locale, "uploadingDesc") : t(locale, "generatingDesc")}
            </p>
          </div>}

        {appState === "error" && <div className="flex-1 flex flex-col items-center justify-center gap-element">
            <p className="text-[14px] text-foreground text-center leading-[1.79] tracking-[-0.28px]">{errorMsg}</p>
            <button onClick={handleReset} className="px-[20px] py-[20px] border border-foreground text-foreground font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity">
              {t(locale, "errorRetry")}
            </button>
          </div>}

        {appState === "done" && resultImageUrl && <div className="flex-1 flex flex-col gap-section min-h-0 overflow-y-auto">
            {/* Image area with history */}
            <div className="flex gap-element flex-1 min-h-0">
              {/* Left: History thumbnails */}
              <div className="flex-shrink-0 w-14 flex flex-col gap-2 overflow-y-auto">
                {historyImages.map((item, idx) => <button key={idx} onClick={() => handleSelectHistory(idx)} className={`w-14 h-[74px] flex-shrink-0 overflow-hidden border transition-all ${idx === selectedIndex ? "border-foreground" : "border-border opacity-60"}`}>
                    <img src={item.url} alt={item.label} crossOrigin="anonymous" className="w-full h-full object-cover" />
                  </button>)}
              </div>

              {/* Right: Main preview */}
              <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
                <img src={resultImageUrl} alt="result" crossOrigin="anonymous" className="max-w-full max-h-[45vh] object-contain" />
              </div>
            </div>

            {/* Scale Slider */}
            <div className="bg-card px-4 py-3 space-y-2 flex-shrink-0 rounded-[8px]">
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-medium text-foreground tracking-[-0.28px]">
                  {t(locale, "scaleLabel")}
                </span>
                <span className="font-medium text-foreground tracking-[-0.5px] text-[16px]">
                  {headScale.toFixed(1)}x
                </span>
              </div>
              <Slider value={[headScale]} onValueChange={v => setHeadScale(v[0])} min={1.0} max={4.0} step={0.5} className="w-full" />
              <div className="flex justify-between text-[14px] text-muted-foreground tracking-[-0.28px]">
                <span className="text-[12px]">1.0x</span>
                <span className="text-[12px]">2.0x</span>
                <span className="text-[12px]">3.0x</span>
                <span className="text-[12px]">4.0x</span>
              </div>
              <button onClick={handleRegenerate} disabled={isLoading} className="w-full mt-element flex items-center justify-center gap-2 h-[48px] rounded-[8px] border border-foreground text-foreground font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity disabled:opacity-30">
                <Sparkles className="w-4 h-4" />
                {t(locale, "regenerate")}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-element flex-shrink-0">
              <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 h-[48px] rounded-[8px] border border-foreground text-foreground font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity">
                <RefreshCw className="w-4 h-4" />
                {t(locale, "changePhoto")}
              </button>
              <a href={resultImageUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 h-[48px] rounded-[8px] bg-foreground text-background font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity">
                <Download className="w-4 h-4" />
                {t(locale, "viewFull")}
              </a>
            </div>
          </div>}
      </main>
    </div>;
};
export default Index;