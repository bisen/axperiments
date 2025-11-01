import type { APIRoute } from "astro";
import { recipeService } from "../../../lib/services/recipe.service";
import { getApi } from "../../../bknd";

// POST /api/recipes - Create new recipe
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
    const body = await context.request.json();
    const { name, description, yields, notes, source, public: isPublic, ingredients, steps } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ success: false, error: "Recipe name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!ingredients || ingredients.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "At least one ingredient is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!steps || steps.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "At least one step is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Find or create ingredients
    const ingredientNames = ingredients.map((i: any) => i.name);
    const ingredientsResult = await recipeService.findOrCreateIngredients(api, ingredientNames);

    if (!ingredientsResult.success || !ingredientsResult.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: ingredientsResult.error || "Failed to process ingredients"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Map ingredient names to IDs
    const ingredientMap = new Map<string, string>();
    ingredientsResult.data.forEach((ingredient: any) => {
      ingredientMap.set(ingredient.name.toLowerCase(), ingredient.id);
    });

    // Convert ingredients with proper IDs
    const processedIngredients = ingredients.map((ing: any, index: number) => ({
      recipeId: "",
      ingredientId: ingredientMap.get(ing.name.toLowerCase()) || "",
      amounts: [{ amount: ing.amount, unit: ing.unit }],
      processing: [],
      notes: [],
      order: index
    }));

    // Convert steps
    const processedSteps = steps.map((step: string, index: number) => ({
      recipeId: "",
      order: index,
      instruction: step,
      notes: []
    }));

    // Create recipe
    const recipeData = {
      name: name.trim(),
      description: description?.trim() || "",
      yields: yields || [],
      notes: notes || [],
      source: source || {},
      public: isPublic || false,
      userId: user.id
    };

    const result = await recipeService.createRecipe(api, recipeData, processedIngredients, processedSteps);

    return new Response(JSON.stringify(result), {
      status: result.success ? 201 : 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
