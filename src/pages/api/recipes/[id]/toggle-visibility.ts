import type { APIRoute } from "astro";
import { recipeService } from "../../../../lib/services/recipe.service";
import { getApi } from "../../../../bknd";

// PUT /api/recipes/:id/toggle-visibility - Toggle recipe public/private
export const PUT: APIRoute = async (context) => {
  const api = await getApi(context);
  const user = api.getUser();

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { id } = context.params;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: "Recipe ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const result = await recipeService.toggleRecipeVisibility(api, id, user.id);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : result.code === "AUTHORIZATION_ERROR" ? 403 : 500,
    headers: { "Content-Type": "application/json" }
  });
};
