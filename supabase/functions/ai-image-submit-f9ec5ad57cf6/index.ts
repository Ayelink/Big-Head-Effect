const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitImageRequest {
  model: string;
  prompt: string;
  type?: "txt_2_img" | "img_2_img";
  resource_path?: string;
  refer_image_resource_paths?: string[];
  image_option?: {
    ratio?: string;
    resolution?: string;
    format?: string;
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_f9ec5ad57cf6");
    if (!AI_API_TOKEN) {
      return jsonResponse(500, {
        success: false,
        message: "AI服务未配置",
        code: "configuration_error",
      });
    }

    const body: SubmitImageRequest = await req.json();
    const type = body.type ?? "txt_2_img";
    const imageOption = body.image_option ?? {};

    if (!body.model) {
      return jsonResponse(400, {
        success: false,
        message: "model is required",
        code: "invalid_request_error",
      });
    }
    if (!body.prompt?.trim()) {
      return jsonResponse(400, {
        success: false,
        message: "prompt is required",
        code: "invalid_request_error",
      });
    }
    if (type === "img_2_img" && !body.resource_path) {
      return jsonResponse(400, {
        success: false,
        message: "resource_path is required for img_2_img",
        code: "invalid_request_error",
      });
    }

    const requestBody: Record<string, unknown> = {
      model: body.model,
      prompt: body.prompt.trim(),
      type,
      image_option: imageOption,
    };

    if (type === "img_2_img") {
      requestBody.resource_path = body.resource_path;
      if ((body.refer_image_resource_paths ?? []).length > 0) {
        requestBody.refer_image_resource_paths = body.refer_image_resource_paths;
      }
    }

    console.log(`[AI Image] Submitting ${type} request with model: ${body.model}`);

    const response = await fetch("https://api.enter.pro/code/api/v1/ai/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_TOKEN}`,
        "Content-Type": "application/json",
        "X-Async": "true",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error?.message || data.message || "图像生成失败";
      const rawCode = data.error?.type || data.code || "api_error";
      return jsonResponse(response.status, {
        success: false,
        message,
        code: rawCode,
      });
    }

    return jsonResponse(200, {
      success: true,
      task_id: data.task_id,
      status: data.status,
    });
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      message: error instanceof Error ? error.message : "内部错误",
      code: "internal_error",
    });
  }
});
