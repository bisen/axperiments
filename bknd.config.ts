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

    // AX Experiment Cells - similar to Jupyter notebook cells
    ax_cells: entity("ax_cells", {
      content: text().required(), // The signature/code content
      output: text(), // Execution output/result
      order: number().required(), // Display order
      cell_type: text().required() // 'signature', 'code', etc.
    })
  },
  ({ relation, index }, { users, ax_cells }) => {
    // Define relations
    relation(ax_cells).manyToOne(users);

    // Define indices
    index(ax_cells).on(["order"]);
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
        issuer: "axperiments",
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
