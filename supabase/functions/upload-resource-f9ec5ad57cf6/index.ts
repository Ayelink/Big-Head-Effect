const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UPLOAD_CONFIG = {
  maxFileSizeMB: 10,
  allowedExtensions: ["jpg", "jpeg", "png", "gif", "webp"],
};

interface UploadRequest {
  file_name: string;
  file_size: number;
}

function successResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, message: string, code: string) {
  console.error(`[Upload Error] ${code}: ${message}`);
  return new Response(
    JSON.stringify({ success: false, message, code }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function validateFile(fileName: string, fileSize: number): string | null {
  const maxSizeBytes = UPLOAD_CONFIG.maxFileSizeMB * 1024 * 1024;
  if (fileSize > maxSizeBytes) {
    return `文件过大，最大允许 ${UPLOAD_CONFIG.maxFileSizeMB}MB`;
  }
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext || !UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
    return `不支持的文件类型，允许：${UPLOAD_CONFIG.allowedExtensions.join(", ")}`;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EDGE_FUNCTION_TOKEN = Deno.env.get("EDGE_FUNCTION_TOKEN_f9ec5ad57cf6");
    if (!EDGE_FUNCTION_TOKEN) {
      return errorResponse(500, "上传服务未配置", "configuration_error");
    }

    if (req.method === "POST") {
      const body: UploadRequest = await req.json();
      const { file_name, file_size } = body;

      if (!file_name) {
        return errorResponse(400, "请选择一个文件", "empty_file_name");
      }
      if (!file_size || file_size <= 0) {
        return errorResponse(400, "文件大小无效", "invalid_file_size");
      }

      const validationError = validateFile(file_name, file_size);
      if (validationError) {
        return errorResponse(400, validationError, "validation_error");
      }

      const params = new URLSearchParams({
        file_name,
        file_size: String(file_size),
      });
      console.log(`[Upload] Requesting upload URL for: ${file_name} (${file_size} bytes)`);

      const response = await fetch(
        `https://api.enter.pro/code/api/v1/edge-function/resource_path?${params}`,
        { headers: { Authorization: `Bearer ${EDGE_FUNCTION_TOKEN}` } }
      );

      const apiResponse = await response.json() as {
        code?: number;
        message?: string;
        data?: { upload_url?: string; resource_path?: string };
      };

      if (response.ok && apiResponse.code === 0 && apiResponse.data) {
        console.log(`[Upload] Got resource_path: ${apiResponse.data.resource_path}`);
        return successResponse({
          upload_url: apiResponse.data.upload_url,
          resource_path: apiResponse.data.resource_path,
        });
      }

      return errorResponse(
        response.status,
        apiResponse.message || "获取上传地址失败",
        "api_error"
      );
    }

    return errorResponse(404, "Not found", "not_found");
  } catch (error) {
    return errorResponse(500, error.message || "内部错误", "internal_error");
  }
});
