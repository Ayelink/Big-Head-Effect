import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, ImagePlus, Loader2, Download, RefreshCw, Sparkles, Globe, ChevronDown, CreditCard, Smartphone, Wallet } from "lucide-react";
import { useResourceUpload } from "@/hooks/useResourceUpload";
import { useAIImage } from "@/hooks/useAIImage";
import { Slider } from "@/components/ui/slider";
import { type Locale, t } from "@/lib/i18n";
import { trackEvent } from "@enter-pro/analytics-sdk";
import { supabase } from "@/integrations/supabase/client";
type AppState = "idle" | "uploading" | "generating" | "done" | "error";
interface HistoryItem {
  url: string;
  label: string;
}
function buildPrompt(scale: number): string {
  return `You are a strict photo editing tool. Your ONLY task is to enlarge the head in this photo.

CRITICAL INSTRUCTIONS:
1. SCALE ONLY THE HEAD: Enlarge the head and hair to ${scale}x size.
2. ZERO OTHER CHANGES: The face identity, expression, glasses, lighting, and skin MUST remain 100% identical to the original. Do not redraw or alter the face.
3. NO HALLUCINATIONS: If this is a half-body or upper body portrait, keep it exactly as a half-body or upper body portrait. DO NOT add legs, lower body, or any parts not visible in the original.
4. EXACT COMPOSITION: Keep the exact same background, hands, clothing, and framing. Do not zoom out. Do not change the image boundaries.`;
}
const STANDARD_RATIOS = [
  { name: "16:9", value: 16 / 9 },
  { name: "9:16", value: 9 / 16 },
  { name: "4:3", value: 4 / 3 },
  { name: "3:4", value: 3 / 4 },
  { name: "3:2", value: 3 / 2 },
  { name: "2:3", value: 2 / 3 },
  { name: "1:1", value: 1 },
];

async function prepareImageFile(file: File): Promise<{ file: File, ratio: string, originalUrl: string }> {
  return new Promise((resolve, reject) => {
    const originalUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const r = w / h;
      
      let closestRatio = STANDARD_RATIOS[0];
      let minDiff = Math.abs(r - closestRatio.value);
      
      for (let i = 1; i < STANDARD_RATIOS.length; i++) {
        const diff = Math.abs(r - STANDARD_RATIOS[i].value);
        if (diff < minDiff) {
          minDiff = diff;
          closestRatio = STANDARD_RATIOS[i];
        }
      }
      
      if (minDiff <= 0.05) {
        resolve({ file, ratio: closestRatio.name, originalUrl });
        return;
      }
      
      const targetRatioValue = closestRatio.value;
      let targetW = w;
      let targetH = h;
      
      if (r > targetRatioValue) {
        targetW = Math.round(h * targetRatioValue);
      } else {
        targetH = Math.round(w / targetRatioValue);
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ file, ratio: closestRatio.name, originalUrl });
        return;
      }
      
      const offsetX = Math.round((w - targetW) / 2);
      const offsetY = Math.round((h - targetH) / 2);
      
      ctx.drawImage(img, offsetX, offsetY, targetW, targetH, 0, 0, targetW, targetH);
      
      canvas.toBlob((blob) => {
        if (blob) {
          // Force jpeg format to avoid HEIC encoding issues on iOS
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          const croppedFile = new File([blob], newFileName, { type: "image/jpeg" });
          resolve({ file: croppedFile, ratio: closestRatio.name, originalUrl: URL.createObjectURL(croppedFile) });
        } else {
          resolve({ file, ratio: closestRatio.name, originalUrl });
        }
      }, "image/jpeg", 0.9);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = originalUrl;
  });
}

const ENABLE_PAYMENT = true;

const Index = () => {
  const [locale, setLocale] = useState<Locale>("en");
  const [langOpen, setLangOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultImageUrl, setResultImageUrl] = useState<string>("");
  const [headScale, setHeadScale] = useState(2.0);
  const [historyImages, setHistoryImages] = useState<HistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const lastResourcePathRef = useRef<string | null>(null);
  const originalPreviewRef = useRef<string | null>(null);
  const imageRatioRef = useRef<string>("3:4");
  const {
    previewUrl,
    uploadFile,
    reset: resetUpload
  } = useResourceUpload();
  const {
    isLoading,
    submitAndPoll,
    clearImages,
    error: aiError
  } = useAIImage();
  const generateWithScale = useCallback(async (resourcePath: string, scale: number) => {
    setAppState("generating");
    setResultImageUrl("");
    const result = await submitAndPoll({
      model: "google/gemini-3.1-flash-image-preview",
      prompt: buildPrompt(scale),
      type: "img_2_img",
      resource_path: resourcePath,
      ratio: imageRatioRef.current,
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
      trackEvent("generation_failed", {
        eventType: "custom",
        properties: { scale }
      });
      // We will rely on the useEffect below to set the actual error message
    }
  }, [submitAndPoll, locale]);

  // Update error message when aiError changes
  useEffect(() => {
    if (aiError) {
      setErrorMsg(aiError);
    } else if (appState === "error" && !errorMsg) {
      setErrorMsg(t(locale, "generateFailed"));
    }
  }, [aiError, appState, locale, errorMsg]);
  // Restore state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem('bighead_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.appState === 'done' && parsed.historyImages?.length > 0) {
          // Filter out blob URLs as they are invalid after reload
          const validHistory = parsed.historyImages.filter((item: HistoryItem) => !item.url.startsWith('blob:'));
          
          if (validHistory.length > 0) {
            setHistoryImages(validHistory);
            // Adjust selected index if needed
            const newIndex = Math.min(parsed.selectedIndex || 0, validHistory.length - 1);
            setSelectedIndex(newIndex);
            setResultImageUrl(validHistory[newIndex].url);
            
            setAppState('done');
            if (parsed.lastResourcePath) lastResourcePathRef.current = parsed.lastResourcePath;
            if (parsed.imageRatio) imageRatioRef.current = parsed.imageRatio;
            if (parsed.headScale) setHeadScale(parsed.headScale);
          }
        }
      }
    } catch (e) {
      console.error("Failed to restore state", e);
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (appState === 'done' && historyImages.length > 0) {
      const stateToSave = {
        appState,
        historyImages,
        selectedIndex,
        lastResourcePath: lastResourcePathRef.current,
        imageRatio: imageRatioRef.current,
        headScale
      };
      sessionStorage.setItem('bighead_state', JSON.stringify(stateToSave));
    }
  }, [appState, historyImages, selectedIndex, headScale]);

  const processImage = useCallback(async (file: File) => {
    setAppState("uploading");
    setErrorMsg("");
    setResultImageUrl("");
    setHistoryImages([]);
    setSelectedIndex(0);

    try {
      const { file: processedFile, ratio, originalUrl } = await prepareImageFile(file);
      imageRatioRef.current = ratio;

      const resourcePath = await uploadFile(processedFile);
      if (!resourcePath) {
        setAppState("error");
        setErrorMsg(t(locale, "uploadFailed"));
        trackEvent("upload_failed", {
          eventType: "custom",
          properties: { error_message: "No resource path returned" }
        });
        return;
      }

      originalPreviewRef.current = originalUrl;
      setHistoryImages([{
        url: originalUrl,
        label: t(locale, "original")
      }]);
      lastResourcePathRef.current = resourcePath;
      await generateWithScale(resourcePath, headScale);
    } catch (err) {
      setAppState("error");
      setErrorMsg(t(locale, "uploadFailed"));
      trackEvent("upload_failed", {
        eventType: "custom",
        properties: { error_message: String(err) }
      });
    }
  }, [uploadFile, generateWithScale, headScale, locale]);
  const handleRegenerate = useCallback(() => {
    trackEvent("button_click", {
      eventType: "custom",
      properties: { action_type: "regenerate_click" }
    });
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
    trackEvent("button_click", {
      eventType: "custom",
      properties: { action_type: "change_photo_click" }
    });
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
    sessionStorage.removeItem('bighead_state');
  };
  const handleSelectHistory = (index: number) => {
    setSelectedIndex(index);
    setResultImageUrl(historyImages[index].url);
  };
  const handleDownload = async () => {
    trackEvent("button_click", {
      eventType: "custom",
      properties: { action_type: "download_click" }
    });
    
    if (!resultImageUrl) return;
    
    if (!ENABLE_PAYMENT) {
      // Direct download logic when payment is disabled
      try {
        const response = await fetch(resultImageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `bighead-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Direct download failed:", error);
        window.open(resultImageUrl, '_blank');
      }
      return;
    }
    
    try {
      setIsPaymentLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: 'price_1TcMimEi2590jr7sdOmiIPRQ',
          successUrl: `${window.location.origin}/?success=true&url=${encodeURIComponent(resultImageUrl)}`,
          cancelUrl: `${window.location.origin}/?canceled=true`
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        setPaymentUrl(data.url);
        setShowPaymentSheet(true);
      }
    } catch (error) {
      console.error("Payment failed:", error);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleConfirmPayment = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
      setShowPaymentSheet(false);
    }
  };

  // Handle payment success callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const urlToDownload = params.get('url');
      if (urlToDownload) {
        // Execute actual download
        const downloadImage = async () => {
          try {
            const response = await fetch(decodeURIComponent(urlToDownload));
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `bighead-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(blobUrl);
          } catch (error) {
            console.error("Download failed:", error);
            window.open(decodeURIComponent(urlToDownload), '_blank');
          }
        };
        downloadImage();
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const toggleLang = (l: Locale) => {
    trackEvent("button_click", {
      eventType: "custom",
      properties: { action_type: "language_switch", language: l }
    });
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
            <div onClick={() => {
              trackEvent("button_click", { eventType: "custom", properties: { action_type: "upload_click" } });
              fileInputRef.current?.click();
            }} className="flex flex-col items-center py-10 border border-dashed border-light-pebble rounded-[8px] cursor-pointer active:opacity-70 transition-opacity">
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
              <button onClick={() => {
                trackEvent("button_click", { eventType: "custom", properties: { action_type: "upload_click" } });
                fileInputRef.current?.click();
              }} className="flex-1 flex items-center justify-center gap-2 h-[48px] rounded-[8px] border border-foreground text-foreground font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity">
                <ImagePlus className="w-[18px] h-[18px]" />
                {t(locale, "uploadBtn")}
              </button>
              <button onClick={() => {
                trackEvent("button_click", { eventType: "custom", properties: { action_type: "camera_click" } });
                cameraInputRef.current?.click();
              }} className="flex-1 flex items-center justify-center gap-2 h-[48px] rounded-[8px] border border-foreground text-foreground font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity">
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
            <div className="flex gap-element flex-1 min-h-0 items-start">
              {/* Left: History thumbnails */}
              <div className="flex-shrink-0 w-14 flex flex-col gap-2 overflow-y-auto">
                {historyImages.map((item, idx) => <button key={idx} onClick={() => handleSelectHistory(idx)} className={`w-14 aspect-[3/4] flex-shrink-0 overflow-hidden border transition-all ${idx === selectedIndex ? "border-foreground" : "border-border opacity-60"}`}>
                    <img 
                      src={item.url} 
                      alt={item.label} 
                      crossOrigin="anonymous" 
                      className="w-full h-full object-cover select-none pointer-events-none" 
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                      style={{ WebkitTouchCallout: 'none' }}
                    />
                  </button>)}
              </div>

              {/* Right: Main preview */}
              <div className="flex-1 flex items-start justify-center overflow-hidden min-h-0">
                <img 
                  src={resultImageUrl} 
                  alt="result" 
                  crossOrigin="anonymous" 
                  className="max-w-full max-h-[45vh] object-contain select-none pointer-events-none" 
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                  style={{ WebkitTouchCallout: 'none' }}
                />
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
              <button onClick={handleDownload} disabled={isPaymentLoading} className="flex-1 flex items-center justify-center gap-2 h-[48px] rounded-[8px] bg-foreground text-background font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity disabled:opacity-60">
                {isPaymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isPaymentLoading ? t(locale, "paymentRedirecting") : t(locale, "viewFull")}
              </button>
            </div>
          </div>}
      </main>

      {/* Payment Sheet */}
      {showPaymentSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={() => setShowPaymentSheet(false)} />
          <div className="relative w-full bg-background rounded-t-[16px] p-6 pb-safe space-y-5 animate-in slide-in-from-bottom-full duration-200">
            {/* Title */}
            <h2 className="text-[18px] font-medium text-foreground tracking-[-0.5px]">
              {t(locale, "paymentConfirmTitle")}
            </h2>

            {/* Order Summary */}
            <div className="flex items-center justify-between py-3 border-t border-b border-border">
              <div>
                <p className="text-[14px] text-foreground tracking-[-0.28px]">{t(locale, "paymentItem")}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">x1</p>
              </div>
              <p className="text-[16px] font-medium text-foreground">$0.50</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[14px] text-muted-foreground">{t(locale, "paymentTotal")}</p>
              <p className="text-[18px] font-medium text-foreground">$0.50 USD</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-element pt-1">
              <button
                onClick={() => setShowPaymentSheet(false)}
                className="flex-1 h-[48px] rounded-[8px] border border-foreground text-foreground font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity"
              >
                {t(locale, "paymentCancelBtn")}
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 h-[48px] rounded-[8px] bg-foreground text-background font-medium text-[14px] tracking-[-0.28px] active:opacity-70 transition-opacity"
              >
                {t(locale, "paymentConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>;
};
export default Index;