import type { APIRoute } from "astro";
import { recipeService } from "../../../../lib/services/recipe.service";
import { orfService } from "../../../../lib/services/orf.service";
import { getApi } from "../../../../bknd";

// GET /api/recipes/:id/export - Export recipe as ORF YAML
export const GET: APIRoute = async (context) => {
  const api = await getApi(context);
  const user = api.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = context.params;

  if (!id) {
    return new Response("Recipe ID required", { status: 400 });
  }

  // Get recipe
  const recipeResult = await recipeService.getRecipeById(api, id, user.id);

  if (!recipeResult.success || !recipeResult.data) {
    return new Response("Recipe not found", { status: 404 });
  }

  // Export to ORF
  const exportResult = await orfService.exportAsORF(recipeResult.data);

  if (!exportResult.success || !exportResult.data) {
    return new Response("Export failed", { status: 500 });
  }

  const fileName = recipeResult.data.name.replace(/[^a-zA-Z0-9]/g, "_") + ".yaml";

  return new Response(exportResult.data, {
    status: 200,
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
};
