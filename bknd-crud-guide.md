# BKND CRUD Guide

**A Simple Pattern for Building Go Web Applications with CRUD Operations**

---

## Overview

BKND (Backend) is a lightweight pattern for building web applications in Go with:
- **Chi Router**: Fast, idiomatic HTTP routing
- **Standard Library**: Minimal dependencies
- **Template-First**: Server-rendered HTML with progressive enhancement
- **RESTful Partials**: AJAX-friendly partial responses

---

## Core Principles

1. **Convention over Configuration**: Predictable URL patterns
2. **Progressive Enhancement**: Works without JavaScript
3. **Partial Rendering**: Efficient AJAX updates
4. **Type Safety**: Leverage Go's strong typing

---

## Project Structure

```
/
├── main.go              # Application entry point
├── handlers/            # HTTP handlers
│   └── experiments.go   # CRUD handlers
├── models/              # Data models
│   └── experiment.go    # Experiment model
├── templates/           # HTML templates
│   ├── layouts/         # Base layouts
│   ├── pages/           # Full pages
│   └── partials/        # AJAX partials
└── static/              # CSS, JS, images
```

---

## Routing Pattern

### Full Pages
```go
r.Get("/experiments", handlers.ListExperiments)
r.Get("/experiments/{id}", handlers.ViewExperiment)
r.Get("/experiments/new", handlers.NewExperiment)
```

### Partials for AJAX
```go
r.Route("/partials", func(r chi.Router) {
    r.Get("/experiments", handlers.PartialListExperiments)
    r.Get("/experiments/{id}", handlers.PartialViewExperiment)
    r.Get("/experiments/{id}/edit", handlers.PartialEditExperiment)
    r.Post("/experiments", handlers.PartialCreateExperiment)
    r.Put("/experiments/{id}", handlers.PartialUpdateExperiment)
    r.Delete("/experiments/{id}", handlers.PartialDeleteExperiment)
})
```

---

## Data Model Example

```go
package models

import "time"

type Experiment struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    Signature   string    `json:"signature"`
    Code        string    `json:"code"`
    Output      string    `json:"output,omitempty"`
    Status      string    `json:"status"` // pending, running, completed, error
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

---

## Handler Pattern

### Full Page Handler

```go
func ListExperiments(w http.ResponseWriter, r *http.Request) {
    experiments, err := store.GetAll()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    data := struct {
        Title       string
        Experiments []models.Experiment
    }{
        Title:       "Experiments",
        Experiments: experiments,
    }

    tmpl.ExecuteTemplate(w, "pages/experiments.html", data)
}
```

### Partial Handler

```go
func PartialEditExperiment(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    experiment, err := store.Get(id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    // Render just the edit form partial
    tmpl.ExecuteTemplate(w, "partials/experiment-edit.html", experiment)
}
```

---

## Template Pattern

### Base Layout

```html
<!-- templates/layouts/base.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}}</title>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/@imacrayon/alpine-ajax@0.7.0/dist/cdn.min.js"></script>
</head>
<body>
    <div id="messages" x-sync></div>
    {{template "content" .}}
</body>
</html>
```

### Partial Template

```html
<!-- templates/partials/experiment-edit.html -->
<form method="post"
      action="/partials/experiments/{{.ID}}"
      x-target="experiment-{{.ID}}"
      id="experiment-{{.ID}}">
    <input type="hidden" name="_method" value="PUT">

    <label>Name:
        <input type="text" name="name" value="{{.Name}}" required>
    </label>

    <label>Signature:
        <textarea name="signature" required>{{.Signature}}</textarea>
    </label>

    <button type="submit">Save</button>
    <button type="button"
            @click="$fetch('/partials/experiments/{{.ID}}', '#experiment-{{.ID}}')">
        Cancel
    </button>
</form>
```

---

## CRUD Operations

### Create

```go
func PartialCreateExperiment(w http.ResponseWriter, r *http.Request) {
    var exp models.Experiment

    exp.Name = r.FormValue("name")
    exp.Description = r.FormValue("description")
    exp.Signature = r.FormValue("signature")
    exp.Status = "pending"
    exp.CreatedAt = time.Now()
    exp.UpdatedAt = time.Now()

    if err := store.Create(&exp); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Return the new experiment partial
    tmpl.ExecuteTemplate(w, "partials/experiment-item.html", exp)
}
```

### Read

```go
func PartialViewExperiment(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    exp, err := store.Get(id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    tmpl.ExecuteTemplate(w, "partials/experiment-view.html", exp)
}
```

### Update

```go
func PartialUpdateExperiment(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    exp, err := store.Get(id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    exp.Name = r.FormValue("name")
    exp.Description = r.FormValue("description")
    exp.Signature = r.FormValue("signature")
    exp.UpdatedAt = time.Now()

    if err := store.Update(exp); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    tmpl.ExecuteTemplate(w, "partials/experiment-view.html", exp)
}
```

### Delete

```go
func PartialDeleteExperiment(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    if err := store.Delete(id); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Return empty response or success message
    w.WriteHeader(http.StatusOK)
}
```

---

## Method Override

Since HTML forms only support GET and POST, use a hidden field for PUT/DELETE:

```go
// Middleware to handle method override
func MethodOverride(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Method == "POST" {
            method := r.FormValue("_method")
            if method == "PUT" || method == "DELETE" || method == "PATCH" {
                r.Method = method
            }
        }
        next.ServeHTTP(w, r)
    })
}
```

---

## Best Practices

1. **Validate Input**: Use a validation library or custom validators
2. **Handle Errors**: Return appropriate HTTP status codes
3. **Use Partials**: Keep partial templates small and focused
4. **Type Safety**: Define clear data models
5. **Test Handlers**: Write unit tests for CRUD operations
6. **Security**: Sanitize input, use CSRF protection
7. **Logging**: Log all CRUD operations for debugging

---

## Example: Complete CRUD Flow

1. **User clicks "New Experiment"** → GET `/experiments/new`
2. **Server returns full page** with empty form
3. **User fills form and submits** → POST `/partials/experiments` (AJAX)
4. **Server validates and creates** → Returns partial HTML
5. **Alpine AJAX updates page** → New experiment appears in list
6. **User clicks "Edit"** → GET `/partials/experiments/{id}/edit` (AJAX)
7. **Server returns edit form** as partial
8. **Alpine AJAX replaces content** → Form appears in place
9. **User updates and submits** → PUT `/partials/experiments/{id}` (AJAX)
10. **Server updates and returns** → Updated view partial
11. **Alpine AJAX replaces content** → Changes visible immediately

---

## Summary

The BKND pattern provides:
- ✅ Clean separation of concerns
- ✅ Progressive enhancement
- ✅ Efficient partial updates
- ✅ Type-safe Go code
- ✅ RESTful API design
- ✅ No JSON serialization needed
- ✅ Server-side rendering benefits

Perfect for building modern web applications that work without JavaScript but feel smooth with it enabled.
