import type { APIRoute } from "astro";
import { getApi } from "@/bknd.ts";

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
    // Get the highest order number for the user's cells
    const { data: existingCells } = await api.data.readMany("ax_cells", {
      where: { users: { id: user.id } },
      sort: { by: "order", dir: "desc" },
      limit: 1
    });

    const nextOrder = existingCells.length > 0 ? (existingCells[0].order || 0) + 1 : 0;

    // Create a new cell
    const result = await api.data.createOne("ax_cells", {
      content: "",
      output: "",
      order: nextOrder,
      cell_type: "signature",
      users: { $set: { id: user.id } }
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to add cell"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
