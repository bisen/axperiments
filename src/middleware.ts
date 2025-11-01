import type { MiddlewareNext } from "astro";
import type { APIContext } from "astro";
import { createRuntimeApp } from "bknd/adapter";
import { config } from "./bknd";

// Doing this because I want to redirect to our custom
// login and register pages. This is optional!
const bkndRedirects: Record<string, string> = {
  "/admin/auth/login": "/login",
  "/admin/auth/register": "/register"
};

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  const request = context.request;
  const url = new URL(request.url);

  const app = await createRuntimeApp(
    {
      ...config,
      onBuilt: async (app) => {
        app.registerAdminController({
          assetsPath: "/bknd/",
          adminBasepath: "/admin",
          logoReturnPath: "/../"
        });
      }
    },
    context
  );

  // Handle bknd's native API routes and /admin
  // bknd handles: /api/data/*, /api/auth/*, /api/media/*, /api/system/*, /admin
  // Custom Astro routes like /api/recipes/* will pass through to Astro's file-based routing
  const isBkndRoute =
    url.pathname.startsWith("/api/data/") ||
    url.pathname.startsWith("/api/auth/") ||
    url.pathname.startsWith("/api/media/") ||
    url.pathname.startsWith("/api/system/") ||
    url.pathname.startsWith("/admin");

  if (isBkndRoute) {
    if (bkndRedirects[url.pathname]) {
      return context.redirect(bkndRedirects[url.pathname]);
    }

    try {
      const response = await app.fetch(request);
      return response;
    } catch (error: any) {
      console.error(error);
      context.cookies.set(
        "__bknd_flash",
        error?.message ||
          (import.meta.env.DEV
            ? "An unknown error occurred. Check the console for more details."
            : "An unknown error occurred.")
      );
      return context.redirect("/");
    }
  }

  return next();
}
