# Complete Guide to Building CRUD Apps with Astro + Bknd

**Last Updated:** 2025-11-01
**Bknd Version:** 0.19.0
**Astro Version:** 5.12.0

---

## Table of Contents

1. [Introduction](#introduction)
2. [Project Setup](#project-setup)
3. [Database Schema Design](#database-schema-design)
4. [Understanding Relations](#understanding-relations)
5. [Service Layer Pattern](#service-layer-pattern)
6. [API Routes](#api-routes)
7. [Frontend Integration](#frontend-integration)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide shows you how to build full CRUD (Create, Read, Update, Delete) applications using Astro and bknd. We'll use a real-world example of a recipe management system with multiple related entities.

### What You'll Learn

- How to define database schemas with relations
- Proper bknd API syntax for v0.19.0+
- Service layer patterns for clean architecture
- API route implementation
- Working with related data

---

## Project Setup

### 1. Install Dependencies

```bash
npm install bknd @libsql/client
```

### 2. Configure Bknd

Create `bknd.config.ts` in your project root:

```typescript
import type { AstroBkndConfig } from "bknd/adapter/astro";
import type { APIContext } from "astro";
import { registerLocalMediaAdapter } from "bknd/adapter/node";
import { em, entity, number, text, libsql, boolean, json, systemEntity } from "bknd";
import { secureRandomString } from "bknd/utils";
import { syncTypes } from "bknd/plugins";
import { createClient } from "@libsql/client";

const schema = em(
  {
    // Your entities here
  },
  (helpers, entities) => {
    // Relations and indices here
  }
);

export default {
  app: (_ctx: APIContext) => ({
    connection:
      !!process.env.DB_LIBSQL_URL && !!process.env.DB_LIBSQL_TOKEN
        ? libsql(
            createClient({
              url: process.env.DB_LIBSQL_URL,
              authToken: process.env.DB_LIBSQL_TOKEN
            })
          )
        : {
            url: "file:.astro/content.db"
          }
  }),
  config: {
    data: schema.toJSON(),
    auth: {
      allow_register: true,
      enabled: true,
      jwt: {
        issuer: "your-app-name",
        secret: secureRandomString(64)
      },
      guard: {
        enabled: true
      }
    }
  },
  options: {
    plugins: [
      syncTypes({
        enabled: true,
        write: async (et) => {
          await import("fs/promises").then((fs) => fs.writeFile("src/bknd-types.d.ts", et.toString()));
        }
      })
    ]
  }
} as const satisfies AstroBkndConfig<APIContext>;
```

### 3. Setup Middleware

Create `src/middleware.ts`:

```typescript
import { sequence } from "astro:middleware";
import { createMiddleware } from "bknd/adapter/astro";
import config from "../bknd.config";

export const onRequest = sequence(createMiddleware(config));
```

### 4. Create API Helper

Create `src/bknd.ts`:

```typescript
import type { AstroGlobal } from "astro";
import { getApp as getBkndApp } from "bknd/adapter/astro";
import config from "../bknd.config";

export async function getApp() {
  return await getBkndApp(config);
}

export async function getApi(astro: AstroGlobal, opts?: { mode: "static" } | { mode?: "dynamic"; verify?: boolean }) {
  const app = await getApp();

  if (opts?.mode !== "static" && opts?.verify) {
    const api = app.getApi({ headers: astro.request.headers });
    await api.verifyAuth();
    return api;
  }

  return app.getApi({ headers: astro.request.headers });
}
```

---

## Database Schema Design

### Defining Entities

Entities are tables in your database. Use field types to define columns:

```typescript
import { em, entity, text, number, boolean, json, systemEntity } from "bknd";

const schema = em(
  {
    // System entity for users
    users: systemEntity("users", {}),

    // Recipe entity
    recipes: entity("recipes", {
      name: text().required(),
      description: text(),
      yields: json(), // Array of { amount: number, unit: string }
      notes: json(), // Array of strings
      source: json(), // Object with author, url, book
      public: boolean()
    }),

    // Ingredient entity
    ingredients: entity("ingredients", {
      name: text().required()
    }),

    // Join table for recipe-ingredient relationship
    recipe_ingredients: entity("recipe_ingredients", {
      amounts: json().required(), // Array of { amount: number|string, unit: string }
      processing: json(), // Array of strings
      notes: json(), // Array of strings
      order: number().required()
    }),

    // Steps entity
    steps: entity("steps", {
      order: number().required(),
      instruction: text().required(),
      notes: json() // Array of strings
    })
  },
  // Relations and indices defined in second parameter
  ({ relation, index }, { recipes, ingredients, recipe_ingredients, steps, users }) => {
    // Define relations
    relation(recipes).manyToOne(users);
    relation(recipe_ingredients).manyToOne(recipes);
    relation(recipe_ingredients).manyToOne(ingredients);
    relation(steps).manyToOne(recipes);

    // Define indices
    index(ingredients).on(["name"], true); // unique index
    index(recipes).on(["name"]);
  }
);
```

### Field Types

| Type        | Description   | Example                   |
| ----------- | ------------- | ------------------------- |
| `text()`    | String field  | `name: text().required()` |
| `number()`  | Numeric field | `count: number()`         |
| `boolean()` | Boolean field | `active: boolean()`       |
| `json()`    | JSON data     | `metadata: json()`        |
| `date()`    | Date field    | `created_at: date()`      |

### Field Modifiers

- `.required()` - Makes field non-nullable
- `.default(value)` - Sets default value
- `.unique()` - Adds unique constraint

---

## Understanding Relations

Relations connect entities together. Bknd supports several relation types.

### Relation Types

#### 1. Many-to-One (Most Common)

Many records of one entity relate to one record of another.

```typescript
// Many recipes belong to one user
relation(recipes).manyToOne(users);

// Many comments belong to one post
relation(comments).manyToOne(posts);
```

**Database**: Creates a `users_id` field on the `recipes` table.

#### 2. One-to-One

One record relates to exactly one other record.

```typescript
relation(profile).oneToOne(user);
```

#### 3. Many-to-Many

Requires a join table.

```typescript
// Many recipes have many ingredients (through recipe_ingredients)
relation(recipe_ingredients).manyToOne(recipes);
relation(recipe_ingredients).manyToOne(ingredients);
```

### Setting Relations in Mutations

**CRITICAL: Use the `$set` syntax for relations in v0.19.0+**

#### ❌ Wrong (Old Syntax)

```typescript
await api.data.createOne("recipes", {
  name: "Pasta",
  users: userId // ❌ This will fail!
});
```

#### ✅ Correct (v0.19.0 Syntax)

```typescript
await api.data.createOne("recipes", {
  name: "Pasta",
  users: { $set: { id: userId } } // ✅ Correct!
});
```

### Querying Relations

Use the `with` parameter to include related data:

#### ❌ Wrong

```typescript
// ❌ Cannot use boolean true
const result = await api.data.readOne("recipes", recipeId, {
  with: {
    steps: true, // ❌ Error!
    users: true // ❌ Error!
  }
});
```

#### ✅ Correct

```typescript
// ✅ Use empty object {}, string, or nested object
const result = await api.data.readOne("recipes", recipeId, {
  with: {
    steps: {}, // ✅ Load steps
    users: {}, // ✅ Load user
    recipe_ingredients: {
      with: "ingredients" // ✅ Nested relation
    }
  }
});

// ✅ Also valid: string or array
const result = await api.data.readOne("recipes", recipeId, {
  with: "users" // Single relation
});

const result = await api.data.readOne("recipes", recipeId, {
  with: ["users", "steps"] // Multiple relations
});
```

---

## Service Layer Pattern

Create a service layer to encapsulate business logic and keep your code organized.

### Service Structure

Create `src/lib/services/[entity].service.ts`:

```typescript
import type { Api } from "bknd";

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class RecipeService {
  /**
   * Get all recipes for a specific user
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
   * Get a single recipe by ID with ownership check
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

      // Verify ownership
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
   * Create a new recipe with related data
   */
  async createRecipe(
    api: Api,
    data: {
      name: string;
      description?: string;
      userId: string;
    },
    ingredients: Array<{
      ingredientId: string;
      amounts: Array<{ amount: number | string; unit: string }>;
      order: number;
    }>,
    steps: Array<{
      order: number;
      instruction: string;
    }>
  ): Promise<ServiceResult> {
    try {
      // Create recipe with user relation
      const recipeResult = await api.data.createOne("recipes", {
        name: data.name,
        description: data.description || "",
        public: false,
        users: { $set: { id: data.userId } } // ✅ Correct relation syntax
      });
      const recipe = recipeResult.data;

      // Create related ingredients
      await Promise.all(
        ingredients.map((ing) =>
          api.data.createOne("recipe_ingredients", {
            recipes: { $set: { id: recipe.id } },
            ingredients: { $set: { id: ing.ingredientId } },
            amounts: ing.amounts,
            order: ing.order
          })
        )
      );

      // Create steps
      await Promise.all(
        steps.map((step) =>
          api.data.createOne("steps", {
            recipes: { $set: { id: recipe.id } },
            order: step.order,
            instruction: step.instruction
          })
        )
      );

      // Fetch complete recipe
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
   * Update a recipe
   */
  async updateRecipe(
    api: Api,
    recipeId: string,
    userId: string,
    updates: { name?: string; description?: string; public?: boolean }
  ): Promise<ServiceResult> {
    try {
      // Verify ownership first
      const existing = await api.data.readOne("recipes", recipeId, {
        with: "users"
      });

      if (!existing.data) {
        return {
          success: false,
          error: "Recipe not found",
          code: "NOT_FOUND"
        };
      }

      if (existing.data.users?.id !== userId) {
        return {
          success: false,
          error: "Unauthorized",
          code: "AUTHORIZATION_ERROR"
        };
      }

      // Update recipe
      const updated = await api.data.updateOne("recipes", recipeId, updates);

      return {
        success: true,
        data: updated.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update recipe",
        code: "UPDATE_RECIPE_ERROR"
      };
    }
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(api: Api, recipeId: string, userId: string): Promise<ServiceResult> {
    try {
      // Verify ownership
      const existing = await api.data.readOne("recipes", recipeId, {
        with: "users"
      });

      if (!existing.data) {
        return {
          success: false,
          error: "Recipe not found",
          code: "NOT_FOUND"
        };
      }

      if (existing.data.users?.id !== userId) {
        return {
          success: false,
          error: "Unauthorized",
          code: "AUTHORIZATION_ERROR"
        };
      }

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
}

// Export singleton instance
export const recipeService = new RecipeService();
```

---

## API Routes

Create API endpoints in `src/pages/api/[entity]/`.

### List/Create Endpoint

`src/pages/api/recipes/index.ts`:

```typescript
import type { APIRoute } from "astro";
import { recipeService } from "../../../lib/services/recipe.service";
import { getApi } from "../../../bknd";

// GET /api/recipes - List all recipes for current user
export const GET: APIRoute = async (context) => {
  const api = await getApi(context);
  const user = api.getUser();

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const result = await recipeService.getUserRecipes(api, user.id);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { "Content-Type": "application/json" }
  });
};

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
    const { name, description, ingredients, steps } = body;

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

    // Create recipe
    const recipeData = {
      name: name.trim(),
      description: description?.trim() || "",
      userId: user.id
    };

    const result = await recipeService.createRecipe(api, recipeData, ingredients, steps);

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
```

### Individual Resource Endpoint

`src/pages/api/recipes/[id].ts`:

```typescript
import type { APIRoute } from "astro";
import { recipeService } from "../../../lib/services/recipe.service";
import { getApi } from "../../../bknd";

// GET /api/recipes/:id - Get single recipe
export const GET: APIRoute = async (context) => {
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

  const result = await recipeService.getRecipeById(api, id, user.id);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : result.code === "NOT_FOUND" ? 404 : 500,
    headers: { "Content-Type": "application/json" }
  });
};

// PUT /api/recipes/:id - Update recipe
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

  try {
    const body = await context.request.json();
    const result = await recipeService.updateRecipe(api, id, user.id, body);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : result.code === "AUTHORIZATION_ERROR" ? 403 : 500,
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

// DELETE /api/recipes/:id - Delete recipe
export const DELETE: APIRoute = async (context) => {
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

  const result = await recipeService.deleteRecipe(api, id, user.id);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : result.code === "AUTHORIZATION_ERROR" ? 403 : 500,
    headers: { "Content-Type": "application/json" }
  });
};
```

---

## Frontend Integration

### Using API from Astro Pages

```astro
---
import { getApi } from "@/bknd";
import Layout from "@/layouts/Layout.astro";

const api = await getApi(Astro, { verify: true, mode: "dynamic" });
const user = api.getUser();

if (!user) {
  return Astro.redirect("/login");
}

// Fetch data
const { data } = await api.data.readMany("recipes", {
  where: { users: { id: user.id } },
  with: {
    recipe_ingredients: { with: "ingredients" },
    steps: {}
  }
});
---

<Layout title="My Recipes">
  <h1>My Recipes</h1>
  <div class="recipes">
    {
      data.map((recipe) => (
        <article>
          <h2>{recipe.name}</h2>
          <p>{recipe.description}</p>
          <a href={`/recipes/${recipe.id}`}>View Recipe</a>
        </article>
      ))
    }
  </div>
</Layout>
```

### Using API from Client-Side

With Alpine.js and Alpine AJAX:

```astro
<div
  x-data="{
    recipes: [],
    loading: true,
    error: null
  }"
  x-init="
    fetch('/api/recipes')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          recipes = result.data;
        } else {
          error = result.error;
        }
      })
      .finally(() => loading = false)
  "
>
  <template x-if="loading">
    <p>Loading...</p>
  </template>

  <template x-if="error">
    <p class="error" x-text="error"></p>
  </template>

  <template x-if="!loading && !error">
    <div>
      <template x-for="recipe in recipes" :key="recipe.id">
        <article>
          <h2 x-text="recipe.name"></h2>
          <p x-text="recipe.description"></p>
        </article>
      </template>
    </div>
  </template>
</div>
```

---

## Common Patterns

### 1. Filtering by User

Always filter by the current user to ensure data isolation:

```typescript
const recipes = await api.data.readMany("recipes", {
  where: { users: { id: user.id } }
});
```

### 2. Nested Relations

Load nested related data:

```typescript
const recipe = await api.data.readOne("recipes", recipeId, {
  with: {
    recipe_ingredients: {
      with: "ingredients" // Load ingredients through join table
    },
    steps: {},
    users: {}
  }
});
```

### 3. Find or Create Pattern

Useful for tags, categories, or ingredients:

```typescript
async findOrCreate(api: Api, name: string) {
  // Try to find existing
  const existing = await api.data.readMany("ingredients", {
    where: { name }
  });

  if (existing.data.length > 0) {
    return existing.data[0];
  }

  // Create if not found
  const created = await api.data.createOne("ingredients", { name });
  return created.data;
}
```

### 4. Pagination

```typescript
const recipes = await api.data.readMany("recipes", {
  where: { users: { id: user.id } },
  limit: 20,
  offset: page * 20,
  sort: { by: "created_at", dir: "desc" }
});
```

### 5. Counting Records

```typescript
const count = await api.data.count("recipes", {
  users: { id: user.id }
});
```

### 6. Checking Existence

```typescript
const exists = await api.data.exists("recipes", {
  name: "Pasta Carbonara",
  users: { id: user.id }
});
```

---

## Troubleshooting

### Error: Field "X" not found on entity "Y"

**Cause**: Database schema doesn't match your code. You added a relation but didn't reset the database.

**Solution**: Reset your database:

```bash
rm .astro/content.db  # Delete old database
npm run dev           # Restart to recreate with new schema
```

### Error: Cannot use 'in' operator to search for 'with' in true

**Cause**: Using `true` in the `with` parameter (old syntax).

**Solution**: Use `{}`, string, or object:

```typescript
// ❌ Wrong
with: { steps: true }

// ✅ Correct
with: { steps: {} }
```

### Error: Invalid value for relation given

**Cause**: Not using `$set` syntax for relations.

**Solution**: Use proper syntax:

```typescript
// ❌ Wrong
users: userId;

// ✅ Correct
users: {
  $set: {
    id: userId;
  }
}
```

### Error: Cannot connect "X.Y" to "Z.id" = "undefined"

**Cause**: Trying to set a relation with an undefined or invalid ID.

**Solution**: Ensure the related record exists and ID is valid:

```typescript
// Check ID exists
if (!recipe.id) {
  throw new Error("Recipe not created");
}

// Then use it
recipes: {
  $set: {
    id: recipe.id;
  }
}
```

### Error: WITH: "X" is not a relation of "Y"

**Cause**: Trying to query a relation that doesn't exist in schema.

**Solution**: Check your `bknd.config.ts` and ensure the relation is defined:

```typescript
relation(recipes).manyToOne(users); // Must be defined!
```

---

## Best Practices

### 1. Always Use a Service Layer

Keep business logic out of API routes. Services make code testable and reusable.

### 2. Validate User Input

Always validate data before passing to bknd:

```typescript
if (!name || name.trim().length === 0) {
  return { success: false, error: "Name required" };
}

if (name.length > 200) {
  return { success: false, error: "Name too long" };
}
```

### 3. Check Authorization

Always verify the user owns the resource:

```typescript
if (recipe.users?.id !== user.id) {
  return {
    success: false,
    error: "Unauthorized",
    code: "AUTHORIZATION_ERROR"
  };
}
```

### 4. Use TypeScript

Let bknd generate types for you:

```typescript
import type { Recipes, Ingredients } from "./bknd-types";

const recipe: Recipes = await api.data.readOne("recipes", id);
```

### 5. Handle Errors Consistently

Use a consistent error response format:

```typescript
interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
```

### 6. Reset Database After Schema Changes

Whenever you modify relations or add/remove fields, reset your database:

```bash
npm run db:reset-local
```

---

## Quick Reference

### Creating Records with Relations

```typescript
// Single relation (many-to-one)
await api.data.createOne("recipes", {
  name: "Pasta",
  users: { $set: { id: userId } }
});

// Multiple relations
await api.data.createOne("recipe_ingredients", {
  recipes: { $set: { id: recipeId } },
  ingredients: { $set: { id: ingredientId } },
  amounts: [{ amount: "2", unit: "cups" }],
  order: 0
});
```

### Querying with Relations

```typescript
// Simple include
await api.data.readOne("recipes", id, {
  with: "users"
});

// Multiple includes
await api.data.readOne("recipes", id, {
  with: ["users", "steps"]
});

// Nested includes
await api.data.readOne("recipes", id, {
  with: {
    recipe_ingredients: {
      with: "ingredients"
    },
    steps: {}
  }
});
```

### Filtering

```typescript
// By relation
await api.data.readMany("recipes", {
  where: { users: { id: userId } }
});

// By field
await api.data.readMany("recipes", {
  where: { public: true }
});

// Multiple conditions
await api.data.readMany("recipes", {
  where: {
    users: { id: userId },
    public: false
  }
});
```

---

## Additional Resources

- [Bknd Documentation](https://docs.bknd.io)
- [Bknd GitHub](https://github.com/bknd-io/bknd)
- [Astro Documentation](https://docs.astro.build)
- [Freedom Stack v2 Example](https://github.com/cameronapak/freedom-stack-v2)

---

**Happy Building! 🚀**
