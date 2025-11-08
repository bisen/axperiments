import type { APIRoute } from "astro";
import { getApi } from "@/bknd.ts";

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
    return new Response(JSON.stringify({ success: false, error: "Cell ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Verify ownership
    const { data: cell } = await api.data.readOne("ax_cells", id, {
      with: "users"
    });

    if (!cell) {
      return new Response(JSON.stringify({ success: false, error: "Cell not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (cell.users?.id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Delete the cell
    await api.data.deleteOne("ax_cells", id);

    return new Response(
      JSON.stringify({
        success: true,
        data: true
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete cell"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
