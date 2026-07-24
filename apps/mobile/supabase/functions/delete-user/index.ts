// Deploy: supabase functions deploy delete-user
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse(null, 204);
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed.", 405);
  }

  try {
    const userId = await requireAuthenticatedUser(req);
    await deleteAuthUser(userId);
    return corsResponse({ success: true }, 200);
  } catch (error) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status) || 500
        : 500;
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to delete account.";
    return jsonError(message, status);
  }
});

async function requireAuthenticatedUser(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw Object.assign(new Error("Server misconfigured"), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  return data.user.id;
}

async function deleteAuthUser(userId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error("Server misconfigured"), { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw Object.assign(
      new Error(error.message || "Unable to delete account."),
      { status: 500 },
    );
  }
}

function corsResponse(body: unknown, status: number): Response {
  return new Response(body == null ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function jsonError(message: string, status: number): Response {
  return corsResponse({ error: message }, status);
}
