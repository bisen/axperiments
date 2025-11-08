import type { APIRoute } from "astro";
import { getApi } from "@/bknd.ts";

export const POST: APIRoute = async (context) => {
  const api = await getApi(context);
  const user = api.getUser();

  if (!user) {
    return context.redirect("/login");
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
    await api.data.createOne("ax_cells", {
      content: "",
      output: "",
      order: nextOrder,
      cell_type: "signature",
      users: { $set: { id: user.id } }
    });

    // Return updated list of cells
    const { data: cells } = await api.data.readMany("ax_cells", {
      where: { users: { id: user.id } },
      sort: { by: "order", dir: "asc" }
    });

    // Render the cells list
    const html = cells
      .map(
        (cell) => `
          <div class="card" id="cell-${cell.id}">
            <div class="border-border bg-muted flex items-center justify-between border-b px-4 py-2">
              <div class="text-muted-foreground flex items-center gap-2 text-sm">
                <span class="badge">${cell.cell_type}</span>
                <span>Cell ${cell.order}</span>
              </div>
              <div class="flex gap-2">
                <form action="/partials/ax-experiment/${cell.id}/execute" method="POST" x-target="#cell-${cell.id}" x-data @submit.prevent="$el.querySelector('input[name=content]').value = document.querySelector('#textarea-${cell.id}').value; $el.submit()">
                  <input type="hidden" name="content" />
                  <button type="submit" class="btn-ghost btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                    Run
                  </button>
                </form>
                <form action="/partials/ax-experiment/${cell.id}/delete" method="POST" x-target="#cells-container" x-data @submit.prevent="if (confirm('Delete this cell?')) $el.submit()">
                  <button type="submit" class="btn-ghost btn-sm text-destructive">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                </form>
              </div>
            </div>
            <div class="p-4">
              <textarea id="textarea-${cell.id}" class="input mb-2 w-full font-mono text-sm" rows="5" placeholder="Enter your signature or code here...">${cell.content || ""}</textarea>
              ${
                cell.output
                  ? `<div class="bg-muted mt-4 rounded-md p-4">
                      <p class="text-muted-foreground mb-2 text-xs font-semibold uppercase">Output</p>
                      <pre class="text-foreground overflow-x-auto text-sm">${cell.output}</pre>
                    </div>`
                  : ""
              }
            </div>
          </div>
        `
      )
      .join("");

    return new Response(html, {
      status: 201,
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    return new Response(
      `<div class="alert">
        <h2>Error</h2>
        <section>${error instanceof Error ? error.message : "Failed to add cell"}</section>
      </div>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
};
