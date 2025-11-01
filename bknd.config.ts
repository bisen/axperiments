import type { AstroBkndConfig } from "bknd/adapter/astro";
import type { APIContext } from "astro";
import { registerLocalMediaAdapter } from "bknd/adapter/node";
import { em, entity, number, text, libsql, boolean, json, systemEntity } from "bknd";
import { secureRandomString } from "bknd/utils";
import { syncTypes } from "bknd/plugins";
import { createClient } from "@libsql/client";

const schema = em(
  {
    users: systemEntity("users", {}),
    posts: entity("posts", {
      // "id" is automatically added
      title: text().required(),
      slug: text().required(),
      content: text(),
      views: number()
    }),
    comments: entity("comments", {
      content: text()
    }),

    // Recipe management entities
    recipes: entity("recipes", {
      name: text().required(),
      description: text(),
      yields: json(), // Array of { amount: number, unit: string }
      notes: json(), // Array of strings
      source: json(), // { author?, url?, book?: { title, authors, isbn } }
      public: boolean()
    }),
    ingredients: entity("ingredients", {
      name: text().required()
    }),
    recipe_ingredients: entity("recipe_ingredients", {
      amounts: json().required(), // Array of { amount: number|string, unit: string }
      processing: json(), // Array of strings
      notes: json(), // Array of strings
      order: number().required()
    }),
    steps: entity("steps", {
      order: number().required(),
      instruction: text().required(),
      notes: json() // Array of strings
    })

    // relations and indices are defined separately.
    // the first argument are the helper functions, the second the entities.
  },
  ({ relation, index }, { posts, comments, recipes, ingredients, recipe_ingredients, steps, users }) => {
    relation(recipes).manyToOne(users);
    relation(comments).manyToOne(posts);
    // relation as well as index can be chained!
    index(posts).on(["title"]).on(["slug"], true);

    // Recipe relations
    relation(recipe_ingredients).manyToOne(recipes);
    relation(recipe_ingredients).manyToOne(ingredients);
    relation(steps).manyToOne(recipes);

    // Recipe indices
    index(ingredients).on(["name"], true); // unique index
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
  // an initial config is only applied if the database is empty
  config: {
    data: schema.toJSON(),
    // we're enabling auth ...
    auth: {
      allow_register: true,
      enabled: true,
      jwt: {
        issuer: "bknd-astro-example",
        secret: secureRandomString(64)
      },
      guard: {
        enabled: true
      },
      roles: {
        admin: {
          implicit_allow: true
        },
        default: {
          permissions: [
            "system.access.api",
            "data.database.sync",
            "data.entity.create",
            "data.entity.delete",
            "data.entity.update",
            "data.entity.read",
            "media.file.delete",
            "media.file.read",
            "media.file.list",
            "media.file.upload"
          ],
          is_default: true
        }
      }
    },
    // ... and media
    media: {
      enabled: true,
      adapter:
        process.env.NODE_ENV === "development"
          ? registerLocalMediaAdapter()({
              path: "./public/temp/uploads"
            })
          : undefined
    }
  },
  options: {
    // the seed option is only executed if the database was empty
    seed: async (ctx) => {
      // create an admin user
      await ctx.app.module.auth.createUser({
        email: "admin@example.com",
        password: "password",
        role: "admin"
      });

      // create a user
      await ctx.app.module.auth.createUser({
        email: "user@example.com",
        password: "password",
        role: "default"
      });

      // create some entries
      await ctx.em.mutator("posts").insertMany([
        {
          title: "What is Freedom Stack v2?",
          slug: "freedom-stack-v2",
          content:
            "Freedom Stack v2 is a modern web development stack designed to be elementary, financially accessible, and entirely self-hostable. It's built for developers who want a simple yet powerful foundation for building web applications with AI code editor assistance."
        }
      ]);
    },
    plugins: [
      // Writes down the schema types on boot and config change,
      // making sure the types are always up to date.
      syncTypes({
        enabled: true,
        write: async (et) => {
          // customize the location and the writer
          await import("fs/promises").then((fs) => fs.writeFile("src/bknd-types.d.ts", et.toString()));
        }
      })
    ]
  }
} as const satisfies AstroBkndConfig<APIContext>;
