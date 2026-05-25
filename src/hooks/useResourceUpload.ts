import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

const UPLOAD_CONFIG = {
  maxFileSizeMB: 10,
  allowedExtensions: ["jpg", "jpeg", "png", "gif", "webp"],
};

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  resourcePath: string | null;
  previewUrl: string | null;
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
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
      return `不支持的文件类型，允许：${UPLOAD_CONFIG.allowedExtensions.join(", ")}`;
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

      setState(prev => ({ ...prev, progress: 10 }));

      const { data, error: invokeError } = await supabase.functions.invoke<{
        success: boolean;
        upload_url?: string;
        resource_path?: string;
        message?: string;
        code?: string;
      }>("upload-resource-f9ec5ad57cf6", {
        body: { file_name: file.name, file_size: file.size },
      });

      if (invokeError) {
        if (invokeError instanceof FunctionsHttpError) {
          const errorBody = await invokeError.context.json();
          throw new Error(errorBody.message || "获取上传地址失败");
        }
        throw new Error(invokeError.message || "请求失败");
      }

      if (!data?.success || !data.upload_url || !data.resource_path) {
        throw new Error(data?.message || "获取上传地址失败");
      }

      setState(prev => ({ ...prev, progress: 30 }));

      const uploadResponse = await fetch(data.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("文件上传失败");
      }

      setState(prev => ({ ...prev, progress: 100, resourcePath: data.resource_path! }));
      return data.resource_path;
    } catch (err) {
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
