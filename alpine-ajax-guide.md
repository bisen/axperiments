# Alpine AJAX Guide

**Progressive Enhancement for Modern Web Applications**

---

## Overview

Alpine AJAX is a lightweight plugin (3KB) that brings smooth, modern UX to server-rendered applications without requiring a separate API or SPA architecture.

**Key Philosophy**: Your application MUST work with plain HTML first. AJAX is purely an enhancement.

---

## Installation

### Via CDN

```html
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@imacrayon/alpine-ajax@0.7.0/dist/cdn.min.js"></script>
```

### Via NPM

```bash
npm install alpinejs @imacrayon/alpine-ajax
```

```js
import Alpine from 'alpinejs'
import ajax from '@imacrayon/alpine-ajax'

Alpine.plugin(ajax)
Alpine.start()
```

---

## Core Concepts

### Progressive Enhancement

Alpine AJAX only enhances semantic HTML elements (`<a>` and `<form>`). This ensures:
- ✅ Site works without JavaScript
- ✅ Search engines can crawl content
- ✅ Accessible by default
- ✅ Resilient to network issues

### Locality of Behavior

Interaction logic lives in HTML attributes near where it's needed, reducing context-switching.

---

## Basic Usage

### Enhancing Links

```html
<!-- Without JavaScript: normal navigation -->
<!-- With JavaScript: AJAX request + replace target -->
<a href="/experiments/123"
   x-target="experiment-details"
   class="btn">
  View Details
</a>

<div id="experiment-details">
  <!-- Content replaced here -->
</div>
```

**How it works**:
1. User clicks link
2. Alpine AJAX intercepts the click
3. Fetches `/experiments/123` via AJAX
4. Replaces content of `#experiment-details` with response
5. Updates browser history

### Enhancing Forms

```html
<!-- Without JavaScript: normal form submission -->
<!-- With JavaScript: AJAX submit + replace target -->
<form method="post"
      action="/partials/experiments"
      x-target="experiment-list"
      id="new-experiment-form">
  <input type="text" name="name" required>
  <textarea name="signature" required></textarea>
  <button type="submit">Create</button>
</form>

<div id="experiment-list">
  <!-- Updated list appears here -->
</div>
```

---

## Directives

### x-target

Specifies which element to replace with the response.

```html
<a href="/contact/1" x-target="user-details">Edit</a>
```

**Target Selectors**:
- `x-target="user-details"` → Replaces `#user-details`
- `x-target="#user-details"` → Same as above
- `x-target=".user-card"` → Replaces first matching element
- `x-target="this"` → Replaces the element itself

### x-merge

Controls how content is merged.

```html
<div id="messages" x-sync x-merge="append">
  <!-- New messages appended here -->
</div>
```

**Merge Strategies**:
- `replace` (default) → Replace target content
- `append` → Add to end of target
- `prepend` → Add to beginning of target
- `before` → Insert before target
- `after` → Insert after target
- `morph` → Smart diffing (requires Alpine Morph plugin)

### x-sync

Syncs content from server even when not the main target.

```html
<div id="messages" x-sync>
  <!-- Auto-updates if server includes this in response -->
</div>
```

Useful for:
- Flash messages
- Notification counters
- Live updates to header/sidebar

---

## Advanced Patterns

### Search as You Type

```html
<form x-target="search-results"
      action="/search"
      autocomplete="off">
  <input type="search"
         name="q"
         placeholder="Search experiments..."
         @input.debounce.300ms="$el.form.requestSubmit()">
  <button type="submit" x-show="false">Search</button>
</form>

<div id="search-results">
  <!-- Results appear here as user types -->
</div>
```

**Key Features**:
- `@input.debounce.300ms` → Wait 300ms after typing stops
- `$el.form.requestSubmit()` → Trigger form submission
- `x-show="false"` → Hide submit button when JS enabled
- Progressive: Works as normal form without JS

### Infinite Scroll

```html
<div id="experiment-list">
  <!-- Experiments -->

  <div x-intersect="$fetch('/partials/experiments?page=2', '#experiment-list', { merge: 'append' })">
    Loading more...
  </div>
</div>
```

### Inline Editing

```html
<!-- View Mode -->
<div id="experiment-123" x-target="experiment-123">
  <h3>{{.Name}}</h3>
  <p>{{.Description}}</p>
  <a href="/partials/experiments/123/edit"
     x-target="experiment-123">
    Edit
  </a>
</div>

<!-- Edit Mode (server returns this) -->
<form method="post"
      action="/partials/experiments/123"
      x-target="experiment-123"
      id="experiment-123">
  <input type="hidden" name="_method" value="PUT">
  <input type="text" name="name" value="{{.Name}}">
  <textarea name="description">{{.Description}}</textarea>
  <button type="submit">Save</button>
  <a href="/partials/experiments/123"
     x-target="experiment-123">
    Cancel
  </a>
</form>
```

### Delete with Confirmation

```html
<form method="post"
      action="/partials/experiments/123"
      x-target="experiment-123"
      x-merge="morph"
      @submit.prevent="
        if (confirm('Delete this experiment?')) {
          $el.requestSubmit()
        }
      ">
  <input type="hidden" name="_method" value="DELETE">
  <button type="submit">Delete</button>
</form>
```

### Modal Dialog

```html
<div x-data="{ open: false }">
  <button @click="
    open = true;
    $fetch('/partials/experiments/new', '#modal-content')
  ">
    New Experiment
  </button>

  <div x-show="open"
       x-cloak
       class="modal-backdrop">
    <div class="modal">
      <div id="modal-content">
        <!-- Form loaded here -->
      </div>
      <button @click="open = false">Close</button>
    </div>
  </div>
</div>
```

---

## Server-Side Integration

### Detecting AJAX Requests

Alpine AJAX sends these headers:

```
X-Alpine-Request: true
X-Alpine-Target: experiment-details
```

**Go Example**:

```go
func ViewExperiment(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    exp, _ := store.Get(id)

    // Check if AJAX request
    if r.Header.Get("X-Alpine-Request") == "true" {
        // Return just the partial
        tmpl.ExecuteTemplate(w, "partials/experiment-view.html", exp)
        return
    }

    // Return full page
    tmpl.ExecuteTemplate(w, "pages/experiment.html", exp)
}
```

### Using Partials Pattern

**Recommended Structure**:

```
templates/
├── layouts/
│   └── base.html
├── pages/
│   └── experiments.html    # Full page
└── partials/
    ├── experiment-list.html
    ├── experiment-view.html
    ├── experiment-edit.html
    └── experiment-item.html
```

**Handler Example**:

```go
func PartialEditExperiment(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    exp, err := store.Get(id)
    if err != nil {
        http.Error(w, "Not found", 404)
        return
    }

    // Always return partial when under /partials/ route
    tmpl.ExecuteTemplate(w, "partials/experiment-edit.html", exp)
}
```

---

## JavaScript API

### $fetch Helper

```js
// Simple fetch
$fetch('/url', '#target')

// With options
$fetch('/url', '#target', {
  method: 'POST',
  merge: 'append',
  headers: { 'X-Custom': 'value' }
})

// In Alpine component
<div x-data="{
  load() {
    this.$fetch('/partials/data', '#results')
  }
}">
  <button @click="load()">Load</button>
</div>
```

### Events

Listen to AJAX lifecycle events:

```js
document.addEventListener('alpine-ajax:before', (e) => {
  console.log('Starting request', e.detail)
  // e.detail.url
  // e.detail.target
})

document.addEventListener('alpine-ajax:success', (e) => {
  console.log('Success!', e.detail)
})

document.addEventListener('alpine-ajax:error', (e) => {
  console.error('Error!', e.detail)
})
```

**HTML Example**:

```html
<form @alpine-ajax:success="showToast('Saved!')"
      @alpine-ajax:error="showToast('Error!')"
      x-target="result">
  <!-- form fields -->
</form>
```

---

## Styling States

### Loading State

```html
<form x-target="results"
      class="loading:opacity-50 loading:pointer-events-none">
  <!-- Form automatically gets .loading class during request -->
</form>
```

### CSS Classes

Alpine AJAX automatically adds these classes:

- `.loading` → During request
- `.loading-error` → After error
- `.loading-success` → After success

```css
.loading {
  opacity: 0.5;
  pointer-events: none;
}

.loading::after {
  content: " ...";
  animation: pulse 1s infinite;
}
```

---

## Best Practices

### 1. Progressive Enhancement First

```html
<!-- ✅ Good: Works without JS -->
<form method="post" action="/experiments" x-target="list">

<!-- ❌ Bad: Broken without JS -->
<div @click="$fetch('/experiments')">
```

### 2. Use Semantic HTML

```html
<!-- ✅ Good: Semantic link -->
<a href="/edit" x-target="form">Edit</a>

<!-- ❌ Bad: Non-semantic -->
<span @click="$fetch('/edit', '#form')">Edit</span>
```

### 3. Keep Partials Small

```html
<!-- ✅ Good: Focused partial -->
<div id="experiment-name">{{.Name}}</div>

<!-- ❌ Bad: Too broad -->
<div id="entire-page"><!-- everything --></div>
```

### 4. Handle Errors Gracefully

```html
<form @alpine-ajax:error="alert('Please try again')"
      x-target="result">
```

### 5. Validate on Server

Never rely on client-side validation alone. Server MUST validate all inputs.

---

## Common Patterns

### CRUD Interface

```html
<!-- List -->
<div id="experiment-list">
  <button @click="$fetch('/partials/experiments/new', '#modal')">
    New
  </button>

  <!-- Items -->
  <div id="experiment-1">
    <a href="/partials/experiments/1/edit" x-target="experiment-1">Edit</a>
    <form method="post" action="/partials/experiments/1" x-target="experiment-1">
      <input type="hidden" name="_method" value="DELETE">
      <button @submit.prevent="confirm('Delete?') && $el.requestSubmit()">
        Delete
      </button>
    </form>
  </div>
</div>
```

### Multi-Step Form

```html
<form x-data="{ step: 1 }" x-target="form-container">
  <div x-show="step === 1">
    <input name="name" required>
    <button type="button" @click="step = 2">Next</button>
  </div>

  <div x-show="step === 2">
    <textarea name="description"></textarea>
    <button type="button" @click="step = 1">Back</button>
    <button type="submit">Submit</button>
  </div>
</form>
```

### Live Validation

```html
<input type="email"
       name="email"
       @blur="$fetch('/validate/email?email=' + $el.value, '#email-error')">
<div id="email-error"></div>
```

---

## Debugging

### Enable Debug Mode

```js
Alpine.plugin(ajax({ debug: true }))
```

### Network Tab

Check:
- Request URL and method
- `X-Alpine-Request` header
- Response HTML structure
- Status codes

### Common Issues

**Target not updating?**
- Check target ID exists
- Verify server returns HTML (not JSON)
- Check for JavaScript errors

**Form not submitting via AJAX?**
- Ensure `x-target` is set
- Check `action` URL is correct
- Verify Alpine AJAX loaded

**History not working?**
- Ensure full URL in href/action
- Check browser console for errors

---

## Comparison with HTMX

| Feature | Alpine AJAX | HTMX |
|---------|-------------|------|
| Size | 3KB | 14KB |
| Elements | `<a>`, `<form>` only | Any element |
| Philosophy | Strict progressive enhancement | Flexible hypermedia |
| Integration | Works with Alpine.js | Standalone |
| Learning Curve | Minimal (if using Alpine) | Moderate |

**Use Alpine AJAX if**:
- Already using Alpine.js
- Want strict progressive enhancement
- Prefer smaller bundle size

**Use HTMX if**:
- Need more flexibility
- Want rich hypermedia features
- Starting from scratch

---

## Summary

Alpine AJAX provides:
- ✅ Progressive enhancement by design
- ✅ Minimal JavaScript (3KB)
- ✅ Semantic HTML only
- ✅ Server-side rendering
- ✅ Modern UX without SPA complexity
- ✅ Accessibility by default
- ✅ SEO friendly

Perfect for content-heavy sites, e-commerce, blogs, and traditional web applications that want modern interactivity without the complexity of React/Vue/Angular.

**Remember**: If it doesn't work without JavaScript, you're doing it wrong!
