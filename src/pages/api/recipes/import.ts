import type { APIRoute } from "astro";
import { orfService } from "../../../lib/services/orf.service";
import { getApi } from "../../../bknd";

// POST /api/recipes/import - Import recipe from ORF YAML
export const POST: APIRoute = async (context) => {
  const api = await getApi(context);
  const user = api.getUser();

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const formData = await context.request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const fileContent = await file.text();
    const result = await orfService.importORFFile(api, fileContent, user.id);

    return new Response(JSON.stringify(result), {
      status: result.success ? 201 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Import failed"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
