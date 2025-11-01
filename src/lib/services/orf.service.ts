import * as yaml from "js-yaml";
import type { Api } from "bknd";
import { recipeService } from "./recipe.service";
import type { ServiceResult } from "./recipe.service";

/**
 * Open Recipe Format (ORF) Service
 * Handles import and export of recipes in YAML format
 */
export class ORFService {
  /**
   * Import a recipe from ORF YAML format
   */
  async importORFFile(api: Api, fileContent: string, userId: string): Promise<ServiceResult> {
    try {
      const data = yaml.load(fileContent) as any;

      if (!data || typeof data !== "object") {
        return {
          success: false,
          error: "Invalid YAML format",
          code: "INVALID_FORMAT"
        };
      }

      // Validate required fields
      if (!data.name) {
        return {
          success: false,
          error: "Recipe name is required",
          code: "VALIDATION_ERROR"
        };
      }

      // Parse yields
      const yields = [];
      if (data.yields) {
        if (typeof data.yields === "string") {
          // Parse "8 servings" format
          const match = data.yields.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
          if (match) {
            yields.push({
              amount: parseFloat(match[1]),
              unit: match[2] || "servings"
            });
          }
        } else if (Array.isArray(data.yields)) {
          data.yields.forEach((y: any) => {
            if (typeof y === "string") {
              const match = y.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
              if (match) {
                yields.push({
                  amount: parseFloat(match[1]),
                  unit: match[2] || "servings"
                });
              }
            } else if (y.amount && y.unit) {
              yields.push(y);
            }
          });
        }
      }

      // Parse ingredients
      const ingredientsList = [];
      if (data.ingredients && Array.isArray(data.ingredients)) {
        data.ingredients.forEach((ing: any, index: number) => {
          const amounts = [];

          if (ing.amount) {
            if (typeof ing.amount === "string") {
              // Parse "2 cups" format
              const match = ing.amount.match(/^([\d./]+)\s*(.*)$/);
              if (match) {
                amounts.push({
                  amount: match[1],
                  unit: match[2] || ""
                });
              }
            } else if (Array.isArray(ing.amount)) {
              ing.amount.forEach((amt: any) => {
                if (typeof amt === "string") {
                  const match = amt.match(/^([\d./]+)\s*(.*)$/);
                  if (match) {
                    amounts.push({
                      amount: match[1],
                      unit: match[2] || ""
                    });
                  }
                } else if (amt.amount && amt.unit) {
                  amounts.push(amt);
                }
              });
            } else if (ing.amount.amount && ing.amount.unit) {
              amounts.push(ing.amount);
            }
          }

          ingredientsList.push({
            name: ing.name || ing.ingredient || "",
            amounts: amounts.length > 0 ? amounts : [{ amount: "1", unit: "" }],
            processing: Array.isArray(ing.processing) ? ing.processing : ing.processing ? [ing.processing] : [],
            notes: Array.isArray(ing.notes) ? ing.notes : ing.notes ? [ing.notes] : []
          });
        });
      }

      // Parse steps
      const stepsList = [];
      if (data.steps && Array.isArray(data.steps)) {
        data.steps.forEach((step: any, index: number) => {
          let instruction = "";
          let notes: string[] = [];

          if (typeof step === "string") {
            instruction = step;
          } else if (step.instruction) {
            instruction = step.instruction;
            notes = Array.isArray(step.notes) ? step.notes : step.notes ? [step.notes] : [];
          }

          if (instruction) {
            stepsList.push({
              instruction,
              notes
            });
          }
        });
      }

      // Validate we have at least one ingredient and one step
      if (ingredientsList.length === 0) {
        return {
          success: false,
          error: "At least one ingredient is required",
          code: "VALIDATION_ERROR"
        };
      }

      if (stepsList.length === 0) {
        return {
          success: false,
          error: "At least one step is required",
          code: "VALIDATION_ERROR"
        };
      }

      // Find or create ingredients
      const ingredientNames = ingredientsList.map((i) => i.name);
      const ingredientsResult = await recipeService.findOrCreateIngredients(api, ingredientNames);

      if (!ingredientsResult.success || !ingredientsResult.data) {
        return {
          success: false,
          error: ingredientsResult.error || "Failed to process ingredients",
          code: ingredientsResult.code || "INGREDIENT_ERROR"
        };
      }

      // Map ingredient names to IDs
      const ingredientMap = new Map<string, string>();
      ingredientsResult.data.forEach((ingredient: any) => {
        ingredientMap.set(ingredient.name.toLowerCase(), ingredient.id);
      });

      // Convert ingredients with proper IDs
      const processedIngredients = ingredientsList.map((ing, index) => ({
        recipeId: "",
        ingredientId: ingredientMap.get(ing.name.toLowerCase()) || "",
        amounts: ing.amounts,
        processing: ing.processing,
        notes: ing.notes,
        order: index
      }));

      // Convert steps
      const processedSteps = stepsList.map((step, index) => ({
        recipeId: "",
        order: index,
        instruction: step.instruction,
        notes: step.notes
      }));

      // Parse source
      const source: any = {};
      if (data.source) {
        if (typeof data.source === "string") {
          source.url = data.source;
        } else {
          if (data.source.author) source.author = data.source.author;
          if (data.source.url) source.url = data.source.url;
          if (data.source.book) source.book = data.source.book;
        }
      }

      // Create recipe data
      const recipeData = {
        name: data.name,
        description: data.description || "",
        yields,
        notes: Array.isArray(data.notes) ? data.notes : data.notes ? [data.notes] : [],
        source,
        public: false, // Imported recipes are private by default
        userId
      };

      // Create the recipe
      return await recipeService.createRecipe(api, recipeData, processedIngredients, processedSteps);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to import recipe",
        code: "IMPORT_ERROR"
      };
    }
  }

  /**
   * Export a recipe to ORF YAML format
   */
  async exportAsORF(recipe: any): Promise<ServiceResult<string>> {
    try {
      // Build ORF structure
      const orf: any = {
        name: recipe.name
      };

      if (recipe.description) {
        orf.description = recipe.description;
      }

      // Add yields
      if (recipe.yields && recipe.yields.length > 0) {
        orf.yields = recipe.yields.map((y: any) => `${y.amount} ${y.unit}`);
        if (orf.yields.length === 1) {
          orf.yields = orf.yields[0];
        }
      }

      // Add ingredients
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        orf.ingredients = recipe.ingredients.map((ri: any) => {
          const ing: any = {
            name: ri.ingredient?.name || ""
          };

          if (ri.amounts && ri.amounts.length > 0) {
            ing.amount = ri.amounts.map((amt: any) => `${amt.amount} ${amt.unit}`.trim());
            if (ing.amount.length === 1) {
              ing.amount = ing.amount[0];
            }
          }

          if (ri.processing && ri.processing.length > 0) {
            ing.processing = ri.processing.length === 1 ? ri.processing[0] : ri.processing;
          }

          if (ri.notes && ri.notes.length > 0) {
            ing.notes = ri.notes.length === 1 ? ri.notes[0] : ri.notes;
          }

          return ing;
        });
      }

      // Add steps
      if (recipe.steps && recipe.steps.length > 0) {
        orf.steps = recipe.steps.map((step: any) => {
          if (step.notes && step.notes.length > 0) {
            return {
              instruction: step.instruction,
              notes: step.notes.length === 1 ? step.notes[0] : step.notes
            };
          }
          return step.instruction;
        });
      }

      // Add notes
      if (recipe.notes && recipe.notes.length > 0) {
        orf.notes = recipe.notes.length === 1 ? recipe.notes[0] : recipe.notes;
      }

      // Add source
      if (recipe.source) {
        const source = recipe.source;
        if (source.author || source.url || source.book) {
          orf.source = {};
          if (source.author) orf.source.author = source.author;
          if (source.url) orf.source.url = source.url;
          if (source.book) orf.source.book = source.book;
        }
      }

      // Convert to YAML
      const yamlString = yaml.dump(orf, {
        indent: 2,
        lineWidth: 80,
        noRefs: true
      });

      return {
        success: true,
        data: yamlString
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export recipe",
        code: "EXPORT_ERROR"
      };
    }
  }
}

// Export singleton instance
export const orfService = new ORFService();
