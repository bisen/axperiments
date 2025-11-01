import type { Api } from "bknd";

export interface RecipeYield {
  amount: number;
  unit: string;
}

export interface RecipeSource {
  author?: string;
  url?: string;
  book?: {
    title: string;
    authors: string[];
    isbn?: string;
  };
}

export interface IngredientAmount {
  amount: number | string;
  unit: string;
}

export interface CreateRecipeDto {
  name: string;
  description?: string;
  yields?: RecipeYield[];
  notes?: string[];
  source?: RecipeSource;
  public?: boolean;
  userId: string;
}

export interface CreateRecipeIngredientDto {
  recipeId: string;
  ingredientId: string;
  amounts: IngredientAmount[];
  processing?: string[];
  notes?: string[];
  order: number;
}

export interface CreateRecipeStepDto {
  recipeId: string;
  order: number;
  instruction: string;
  notes?: string[];
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class RecipeService {
  /**
   * Get all recipes for a specific user with ingredients and steps
   */
  async getUserRecipes(api: Api, userId: string): Promise<ServiceResult> {
    try {
      const recipes = await api.data.readMany("recipes", {
        where: { users: { id: userId } },
        with: {
          recipe_ingredients: {
            with: "ingredients"
          },
          steps: {}
        }
      });

      return {
        success: true,
        data: recipes.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch recipes",
        code: "FETCH_RECIPES_ERROR"
      };
    }
  }

  /**
   * Get a single recipe with all details
   */
  async getRecipeById(api: Api, recipeId: string, userId: string): Promise<ServiceResult> {
    try {
      const recipeResult = await api.data.readOne("recipes", recipeId, {
        with: {
          recipe_ingredients: { with: "ingredients" },
          steps: {},
          users: {}
        }
      });

      const recipe = recipeResult.data;

      if (!recipe) {
        return {
          success: false,
          error: "Recipe not found",
          code: "NOT_FOUND"
        };
      }

      // Verify ownership using relation
      if (recipe.users?.id !== userId) {
        return {
          success: false,
          error: "Unauthorized to view this recipe",
          code: "AUTHORIZATION_ERROR"
        };
      }

      return {
        success: true,
        data: recipe
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch recipe",
        code: "FETCH_RECIPE_ERROR"
      };
    }
  }

  /**
   * Create a new recipe with ingredients and steps
   */
  async createRecipe(
    api: Api,
    data: CreateRecipeDto,
    ingredients: CreateRecipeIngredientDto[],
    steps: CreateRecipeStepDto[]
  ): Promise<ServiceResult> {
    try {
      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        return {
          success: false,
          error: "Recipe name is required",
          code: "VALIDATION_ERROR"
        };
      }

      const trimmedName = data.name.trim();
      if (trimmedName.length > 200) {
        return {
          success: false,
          error: "Recipe name must be less than 200 characters",
          code: "VALIDATION_ERROR"
        };
      }

      // Create recipe with user relation
      const recipeResult = await api.data.createOne("recipes", {
        name: trimmedName,
        description: data.description?.trim() || "",
        yields: data.yields || [],
        notes: data.notes || [],
        source: data.source || {},
        public: data.public || false,
        users: { $set: { id: data.userId } }
      });
      const recipe = recipeResult.data;

      // Create ingredients with relations
      await Promise.all(
        ingredients.map((ing) =>
          api.data.createOne("recipe_ingredients", {
            recipes: { $set: { id: recipe.id } },
            ingredients: { $set: { id: ing.ingredientId } },
            amounts: ing.amounts,
            processing: ing.processing || [],
            notes: ing.notes || [],
            order: ing.order
          })
        )
      );

      // Create steps with relation
      await Promise.all(
        steps.map((step) =>
          api.data.createOne("steps", {
            recipes: { $set: { id: recipe.id } },
            order: step.order,
            instruction: step.instruction.trim(),
            notes: step.notes || []
          })
        )
      );

      // Fetch complete recipe with relations
      const complete = await api.data.readOne("recipes", recipe.id, {
        with: {
          recipe_ingredients: { with: "ingredients" },
          steps: {}
        }
      });

      return {
        success: true,
        data: complete.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create recipe",
        code: "CREATE_RECIPE_ERROR"
      };
    }
  }

  /**
   * Find or create ingredients by name
   */
  async findOrCreateIngredients(api: Api, names: string[]): Promise<ServiceResult> {
    try {
      const uniqueNames = [...new Set(names.map((n) => n.trim()).filter((n) => n))];
      const results = [];

      for (const name of uniqueNames) {
        // Try to find existing ingredient
        const existing = await api.data.readMany("ingredients", {
          where: { name }
        });

        if (existing.data.length > 0) {
          results.push(existing.data[0]);
        } else {
          // Create new ingredient
          const created = await api.data.createOne("ingredients", { name });
          results.push(created.data);
        }
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to find or create ingredients",
        code: "INGREDIENT_ERROR"
      };
    }
  }

  /**
   * Delete a recipe and all its related ingredients and steps
   */
  async deleteRecipe(api: Api, recipeId: string, userId: string): Promise<ServiceResult> {
    try {
      // Verify ownership first
      const recipeResult = await api.data.readOne("recipes", recipeId, {
        with: "users"
      });
      const recipe = recipeResult.data;

      if (!recipe) {
        return {
          success: false,
          error: "Recipe not found",
          code: "NOT_FOUND"
        };
      }

      if (recipe.users?.id !== userId) {
        return {
          success: false,
          error: "Unauthorized to delete this recipe",
          code: "AUTHORIZATION_ERROR"
        };
      }

      // Delete the recipe (cascade should handle related records if configured)
      await api.data.deleteOne("recipes", recipeId);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete recipe",
        code: "DELETE_RECIPE_ERROR"
      };
    }
  }

  /**
   * Get all public recipes with ingredients and steps
   */
  async getPublicRecipes(api: Api): Promise<ServiceResult> {
    try {
      const recipes = await api.data.readMany("recipes", {
        where: { public: true },
        with: {
          recipe_ingredients: { with: "ingredients" },
          steps: {}
        }
      });

      return {
        success: true,
        data: recipes.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch public recipes",
        code: "FETCH_PUBLIC_RECIPES_ERROR"
      };
    }
  }

  /**
   * Toggle recipe visibility (public/private)
   */
  async toggleRecipeVisibility(api: Api, recipeId: string, userId: string): Promise<ServiceResult> {
    try {
      // Verify ownership first
      const recipeResult = await api.data.readOne("recipes", recipeId, {
        with: "users"
      });
      const recipe = recipeResult.data;

      if (!recipe) {
        return {
          success: false,
          error: "Recipe not found",
          code: "NOT_FOUND"
        };
      }

      if (recipe.users?.id !== userId) {
        return {
          success: false,
          error: "Unauthorized to modify this recipe",
          code: "AUTHORIZATION_ERROR"
        };
      }

      const updated = await api.data.updateOne("recipes", recipeId, {
        public: !recipe.public
      });

      return {
        success: true,
        data: updated.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to toggle recipe visibility",
        code: "TOGGLE_VISIBILITY_ERROR"
      };
    }
  }
}

// Export singleton instance
export const recipeService = new RecipeService();
