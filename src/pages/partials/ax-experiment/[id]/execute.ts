import type { APIRoute } from "astro";
import { getApi } from "@/bknd.ts";

export const POST: APIRoute = async (context) => {
  const api = await getApi(context);
  const user = api.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = context.params;

  if (!id) {
    return new Response("Cell ID required", { status: 400 });
  }

  try {
    const body = await context.request.json();
    const { content } = body;

    // Verify ownership
    const { data: cell } = await api.data.readOne("ax_cells", id, {
      with: "users"
    });

    if (!cell) {
      return new Response("Cell not found", { status: 404 });
    }

    if (cell.users?.id !== user.id) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Simulate execution (in a real implementation, this would call an LLM or execute code)
    const output = `Executed at ${new Date().toISOString()}\n\nInput:\n${content}\n\nThis is a simulated output. In production, this would execute the signature or call an LLM.`;

    // Update cell with new content and output
    const { data: updatedCell } = await api.data.updateOne("ax_cells", id, {
      content,
      output
    });

    // Return HTML for the updated cell
    const html = `
      <div class="card" data-cell-id="${updatedCell.id}">
        <div class="border-border bg-muted flex items-center justify-between border-b px-4 py-2">
          <div class="text-muted-foreground flex items-center gap-2 text-sm">
            <span class="badge">${updatedCell.cell_type}</span>
            <span>Cell ${updatedCell.order}</span>
          </div>
          <div class="flex gap-2">
            <button @click="executeCell(${updatedCell.id})" class="btn-ghost btn-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
              Run
            </button>
            <button @click="deleteCell(${updatedCell.id})" class="btn-ghost btn-sm text-destructive">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete
            </button>
          </div>
        </div>
        <div class="p-4">
          <textarea
            class="input mb-2 w-full font-mono text-sm"
            rows="5"
            placeholder="Enter your signature or code here..."
          >${updatedCell.content}</textarea>
          <div class="bg-muted mt-4 rounded-md p-4">
            <p class="text-muted-foreground mb-2 text-xs font-semibold uppercase">Output</p>
            <pre class="text-foreground overflow-x-auto text-sm">${updatedCell.output}</pre>
          </div>
        </div>
      </div>
    `;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    return new Response(
      `<div class="alert">
        <h2>Error</h2>
        <section>${error instanceof Error ? error.message : "Failed to execute cell"}</section>
      </div>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
};
