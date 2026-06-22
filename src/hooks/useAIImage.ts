import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

interface GeneratedImage {
  url: string;
  meta_data?: Record<string, unknown>;
}

interface GenerateOptions {
  model: string;
  prompt: string;
  type?: "txt_2_img" | "img_2_img";
  resource_path?: string;
  refer_image_resource_paths?: string[];
  resource_url?: string;
  refer_image_urls?: string[];
  ratio?: string;
  resolution?: string;
  format?: string;
}

interface SubmitResponse {
  success: boolean;
  task_id?: string;
  status?: "processing";
  message?: string;
  code?: string;
}

interface TaskStatusResponse {
  task_id: string;
  status: "processing" | "succeed" | "failed";
  images?: GeneratedImage[];
  error?: string;
}

const FALLBACK_MESSAGES: Record<string, string> = {
  authentication_error: "认证失败，请刷新页面重试",
  rate_limit_error: "请求过于频繁，请稍后再试",
  invalid_request_error: "请求参数无效，请重试",
  overloaded_error: "服务繁忙，请稍后再试",
  insufficient_credits: "AI积分已耗尽，请联系管理员",
  permission_error: "AI功能未开启",
  api_error: "服务暂不可用",
  internal_error: "服务出错，请重试",
  configuration_error: "AI服务未配置",
};

function getUserMessage(code?: string, backendMessage?: string): string {
  if (backendMessage) return backendMessage;
  if (code) return FALLBACK_MESSAGES[code] || "服务暂不可用";
  return "服务暂不可用";
}

export function useAIImage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvokeError = useCallback(async (invokeError: unknown) => {
    if (invokeError instanceof FunctionsHttpError) {
      const errorBody = await invokeError.context.json().catch(() => ({}));
      throw new Error(getUserMessage(errorBody.code, errorBody.message));
    }
    if (invokeError instanceof FunctionsRelayError) {
      throw new Error("网络连接错误，请检查网络后重试");
    }
    if (invokeError instanceof FunctionsFetchError) {
      throw new Error("网络请求失败，请稍后重试");
    }
    if (invokeError instanceof Error) {
      throw invokeError;
    }
    throw new Error("网络请求失败");
  }, []);

  const submit = useCallback(
    async (options: GenerateOptions) => {
      setError(null);
      setImages([]);
      setTaskId(null);
      setIsSubmitting(true);

      try {
        const image_option: Record<string, string> = {};
        if (options.ratio) image_option.ratio = options.ratio;
        if (options.resolution) image_option.resolution = options.resolution;
        if (options.format) image_option.format = options.format;

        const { data, error: invokeError } = await supabase.functions.invoke<SubmitResponse>(
          "ai-image-submit-f9ec5ad57cf6",
          {
            body: {
              model: options.model,
              prompt: options.prompt,
              type: options.type ?? "txt_2_img",
              resource_path: options.resource_path,
              refer_image_resource_paths: options.refer_image_resource_paths,
              resource_url: options.resource_url,
              refer_image_urls: options.refer_image_urls,
              image_option,
            },
          }
        );

        if (invokeError) {
          await handleInvokeError(invokeError);
        }

        if (!data?.success || !data.task_id) {
          throw new Error(getUserMessage(data?.code, data?.message || "图像生成失败"));
        }

        setTaskId(data.task_id);
        return data.task_id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "提交图像生成失败";
        setError(message);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [handleInvokeError]
  );

  const poll = useCallback(
    async (currentTaskId: string, maxAttempts = 60) => {
      setError(null);
      setIsPolling(true);

      try {
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const { data, error: invokeError } = await supabase.functions.invoke<TaskStatusResponse>(
            "ai-image-status-f9ec5ad57cf6",
            { body: { task_id: currentTaskId } }
          );

          if (invokeError) {
            await handleInvokeError(invokeError);
          }

          if (!data) {
            throw new Error("未收到任务状态");
          }
          if (data.status === "failed") {
            throw new Error(data.error || "图像生成失败");
          }
          if (data.status === "succeed") {
            const nextImages = data.images || [];
            setImages(nextImages);
            return nextImages;
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        throw new Error("等待图像生成超时");
      } catch (err) {
        const message = err instanceof Error ? err.message : "轮询图像生成失败";
        setError(message);
        return null;
      } finally {
        setIsPolling(false);
      }
    },
    [handleInvokeError]
  );

  const submitAndPoll = useCallback(
    async (options: GenerateOptions) => {
      const nextTaskId = await submit(options);
      if (!nextTaskId) return null;
      return poll(nextTaskId);
    },
    [poll, submit]
  );

  const clearImages = useCallback(() => {
    setImages([]);
    setTaskId(null);
    setError(null);
  }, []);

  return {
    images,
    taskId,
    error,
    isSubmitting,
    isPolling,
    isLoading: isSubmitting || isPolling,
    submit,
    poll,
    submitAndPoll,
    clearImages,
  };
}
