# Ax Experiments

Interactive notebook playground for testing [Ax Framework](https://github.com/ax-llm/ax) signatures and AI programs.

## Features

- 🎯 **Notebook-Style Interface** - Similar to NotebookPlayground.tsx from the Ax repository
- ⚡ **Alpine AJAX Pattern** - Progressive enhancement with minimal JavaScript
- 🔄 **CRUD Operations** - Create, read, update, delete experiments with `/partials/` routing
- 🚀 **No Build Step** - Server-rendered HTML with Alpine.js enhancement
- 📝 **Ax Signatures** - Define and execute Ax framework signatures
- 🎨 **Modern UI** - Clean, responsive design

## Architecture

### Backend (Go)

- **Chi Router** - Fast, idiomatic HTTP routing
- **Standard Library** - Minimal dependencies
- **Template-First** - Server-rendered HTML
- **RESTful Partials** - AJAX-friendly partial responses

### Frontend

- **Alpine.js** - Minimal reactive framework (15KB)
- **Alpine AJAX** - Progressive enhancement plugin (3KB)
- **No Build Tools** - Direct browser execution
- **Progressive Enhancement** - Works without JavaScript

## Project Structure

```
/
├── main.go                 # Application entry point
├── go.mod                  # Go module definition
├── handlers/
│   └── handlers.go         # HTTP request handlers
├── models/
│   └── experiment.go       # Data models
├── store/
│   └── store.go           # In-memory data store
├── templates/
│   ├── layouts/
│   │   └── base.html      # Base layout
│   ├── pages/
│   │   ├── home.html      # Main page
│   │   ├── experiments.html
│   │   └── experiment.html
│   └── partials/          # AJAX partials
│       ├── experiment-list.html
│       ├── experiment-new.html
│       ├── experiment-view.html
│       └── experiment-edit.html
└── static/
    └── styles.css         # Styles
```

## Routing Pattern

### Full Pages

```
GET  /                     # Home page
GET  /experiments          # List all experiments
GET  /experiments/{id}     # View single experiment
```

### Partials (AJAX)

```
GET    /partials/experiments              # List partial
GET    /partials/experiments/new          # New form
GET    /partials/experiments/{id}         # View partial
GET    /partials/experiments/{id}/edit    # Edit form
POST   /partials/experiments              # Create
PUT    /partials/experiments/{id}         # Update
DELETE /partials/experiments/{id}         # Delete
POST   /partials/experiments/{id}/execute # Execute signature
```

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Modern web browser

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd axperiments

# Download dependencies
go mod download

# Run the server
go run main.go
```

The server will start on http://localhost:3000

### Usage

1. **Create an Experiment**
   - Click "Create New Experiment"
   - Enter name, description, and Ax signature
   - Provide JSON input
   - Select AI provider and model

2. **View Experiments**
   - Click "Open" on any experiment card
   - See signature, input, and output

3. **Edit Experiment**
   - Click "Edit" to modify experiment details
   - Changes save via AJAX

4. **Execute Signature**
   - Click "Execute" to run the Ax signature
   - View output in real-time

5. **Delete Experiment**
   - Click "Delete" with confirmation

## Key Patterns

### Progressive Enhancement

All forms and links work without JavaScript. Alpine AJAX enhances them for a smoother experience:

```html
<!-- Works as normal form without JS -->
<!-- Enhanced with AJAX when JS available -->
<form method="post"
      action="/partials/experiments"
      x-target="experiment-list">
  <!-- form fields -->
</form>
```

### Partial Rendering

Server detects AJAX requests and returns only the needed HTML fragment:

```go
func PartialViewExperiment(w http.ResponseWriter, r *http.Request) {
    // Always return partial - route determines context
    tmpl.ExecuteTemplate(w, "partials/experiment-view.html", exp)
}
```

### Method Override

HTML forms only support GET/POST, so we use `_method` for PUT/DELETE:

```html
<form method="post" action="/partials/experiments/123">
    <input type="hidden" name="_method" value="PUT">
    <!-- fields -->
</form>
```

## Guides

- [BKND CRUD Guide](./bknd-crud-guide.md) - Backend pattern documentation
- [Alpine AJAX Guide](./alpine-ajax-guide.md) - Frontend pattern documentation
- [Ax Framework Guide](./ax-framework-guide.md) - Complete Ax framework reference

## Ax Framework Integration

This playground demonstrates Ax concepts:

- **Signatures** - Declarative input/output specifications
- **Providers** - Multiple AI provider support
- **Type System** - String, number, class, json types
- **Execution** - Running signatures with real inputs

Example signature:

```
review:string -> sentiment:class "positive, negative, neutral", confidence:number
```

## Tech Stack

- **Backend**: Go 1.21+
- **Router**: Chi v5
- **Templates**: Go html/template
- **Frontend**: Alpine.js 3.x
- **Enhancement**: Alpine AJAX 0.7.0
- **Styling**: Custom CSS

## Development

### Project Goals

- ✅ Demonstrate Ax Framework capabilities
- ✅ Show Alpine AJAX pattern in practice
- ✅ Provide BKND CRUD pattern example
- ✅ Build without complexity (no npm, webpack, etc.)
- ✅ Progressive enhancement first

### Future Enhancements

- [ ] Real Ax framework execution (currently mocked)
- [ ] Multiple cell support (notebook-style)
- [ ] Persistence (database instead of in-memory)
- [ ] Authentication & authorization
- [ ] Example templates library
- [ ] Export/import experiments

## License

Apache 2.0

## Contributing

Contributions welcome! Please read the guides first to understand the patterns.

## Acknowledgments

- [Ax Framework](https://github.com/ax-llm/ax) - The TypeScript framework for AI applications
- [Alpine.js](https://alpinejs.dev/) - Minimal reactive framework
- [Alpine AJAX](https://alpine-ajax.js.org/) - Progressive enhancement plugin
- [Chi Router](https://github.com/go-chi/chi) - Lightweight Go router
