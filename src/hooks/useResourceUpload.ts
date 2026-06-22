import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const AI_ALL_IMAGE_BUCKET = "images";

const UPLOAD_CONFIG = {
  maxFileSizeMB: 10,
  allowedExtensions: ["jpg", "jpeg", "png", "gif", "webp"],
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  resourcePath: string | null;
  previewUrl: string | null;
}

function extensionFromFile(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpeg") return "jpg";
  return extension || "png";
}

export function useResourceUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    resourcePath: null,
    previewUrl: null,
  });
  const previewUrlRef = useRef<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    const maxSizeBytes = UPLOAD_CONFIG.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `文件过大，最大允许 ${UPLOAD_CONFIG.maxFileSizeMB}MB`;
    }
    const ext = extensionFromFile(file);
    if (!UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
      return `不支持的文件类型，允许：${UPLOAD_CONFIG.allowedExtensions.join(", ")}`;
    }
    if (file.type && !UPLOAD_CONFIG.allowedMimeTypes.includes(file.type)) {
      return "不支持的图片 MIME 类型";
    }
    return null;
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    const newPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = newPreviewUrl;

    setState(prev => ({ ...prev, isUploading: true, progress: 0, error: null, resourcePath: null, previewUrl: newPreviewUrl }));

    try {
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      setState(prev => ({ ...prev, progress: 30 }));

      const ext = extensionFromFile(file);
      const path = `ai-all/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AI_ALL_IMAGE_BUCKET)
        .upload(path, file, {
          contentType: file.type || "image/png",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setState(prev => ({ ...prev, progress: 80 }));

      const { data } = supabase.storage.from(AI_ALL_IMAGE_BUCKET).getPublicUrl(path);
      if (!data.publicUrl) {
        throw new Error("获取图片公开链接失败");
      }

      setState(prev => ({ ...prev, progress: 100, resourcePath: data.publicUrl }));
      return data.publicUrl;
    } catch (err) {
      console.error("[Upload] Caught error:", err);
      const errorMessage = err instanceof Error ? err.message : "上传失败";
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    } finally {
      setState(prev => ({ ...prev, isUploading: false }));
    }
  }, [validateFile]);

  const reset = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      resourcePath: null,
      previewUrl: null,
    });
  }, []);

  return { ...state, uploadFile, reset, validateFile };
}
