const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_f9ec5ad57cf6");
    if (!AI_API_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, message: "AI服务未配置", code: "configuration_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { task_id } = await req.json();
    if (!task_id) {
      return new Response(
        JSON.stringify({ success: false, message: "task_id is required", code: "invalid_request_error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`https://api.enter.pro/code/api/v1/ai/tasks/${task_id}`, {
      headers: { Authorization: `Bearer ${AI_API_TOKEN}` },
    });
    const data = await response.json().catch(() => ({}));

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "内部错误",
        code: "internal_error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
