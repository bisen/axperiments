# Alpine AJAX Implementation Guide

**Reference:** https://alpine-ajax.js.org/
**Last Updated:** 2025-01-08

This document outlines critical requirements and common pitfalls when implementing Alpine AJAX patterns based on official documentation.

---

## Core Principle: Progressive Enhancement

Alpine AJAX works by intercepting standard HTML forms and links. Without JavaScript, all functionality falls back to traditional page navigation and form submissions.

---

## 1. x-target Attribute Syntax

### ❌ INCORRECT
```html
<!-- Using CSS selectors -->
<form x-target="#cells-container">
<a x-target=".item">
<form x-target="div#container">
```

### ✅ CORRECT
```html
<!-- Use ID names only, no selectors -->
<form x-target="cells-container">
<a x-target="item">
<form x-target="container">
```

**Rule:** The `x-target` value must be a plain ID name (or space-separated list of IDs), NOT a CSS selector. Do not include `#`, `.`, or other selector syntax.

---

## 2. Server Response Structure

### Critical Requirement
Server responses **MUST** include an element with an `id` matching the target.

### ❌ INCORRECT
```typescript
// Server returns raw HTML without wrapper
const html = cellsHtml;
return new Response(html, { headers: { "Content-Type": "text/html" } });
```

### ✅ CORRECT
```typescript
// Server returns HTML wrapped in target element
const html = `<div id="cells-container" class="space-y-4">${cellsHtml}</div>`;
return new Response(html, { headers: { "Content-Type": "text/html" } });
```

**How It Works:**
1. Alpine AJAX receives the response HTML
2. Finds the element with `id="cells-container"` in the response
3. Replaces the existing `<div id="cells-container">` on the page with it

---

## 3. Event Handling for Confirmations

### ❌ INCORRECT
```html
<!-- Manual event interception -->
<form
  x-target="items"
  @submit.prevent="if (confirm('Delete?')) $el.submit()">
  <button type="submit">Delete</button>
</form>
```

### ✅ CORRECT
```html
<!-- Use @ajax:before event on parent container -->
<div id="items" @ajax:before.delete="confirm('Delete?') || $event.preventDefault()">
  <form method="DELETE" x-target="items">
    <button type="submit">Delete</button>
  </form>
</div>
```

**Benefits:**
- Uses Alpine AJAX's built-in event system
- Can filter by HTTP method (`.delete`, `.post`, etc.)
- Cleaner separation of concerns
- Works automatically for all matching requests in container

---

## 4. Form Association Pattern

When form inputs need to be outside the `<form>` element (common in table rows or card layouts), use the HTML `form` attribute.

### ❌ INCORRECT
```html
<!-- Manual DOM manipulation to get values -->
<form
  id="execute-1"
  x-target="cell-1"
  @submit.prevent="$el.querySelector('input[name=content]').value = document.querySelector('#textarea-1').value; $el.submit()">
  <input type="hidden" name="content" />
  <button>Submit</button>
</form>
<textarea id="textarea-1">...</textarea>
```

### ✅ CORRECT
```html
<!-- Use HTML form attribute -->
<form id="execute-form-1" x-target="cell-1">
  <button type="submit">Submit</button>
</form>
<textarea name="content" form="execute-form-1">...</textarea>
```

**Advantages:**
- Native HTML feature, no JavaScript needed
- Automatically includes textarea value in form submission
- Cleaner, more maintainable code
- Follows web standards

---

## 5. HTTP Method Attributes

### ❌ INCORRECT
```html
<!-- Using POST for everything -->
<form action="/items/1/delete" method="POST" x-target="items">
```

```typescript
// Endpoint handling POST instead of DELETE
export const POST: APIRoute = async (context) => {
  // delete logic
}
```

### ✅ CORRECT
```html
<!-- Use semantic HTTP methods -->
<form action="/items/1" method="DELETE" x-target="items">
```

```typescript
// Endpoint properly named for HTTP method
export const DELETE: APIRoute = async (context) => {
  // delete logic
}
```

**Supported Methods:**
- `GET` - Retrieve data
- `POST` - Create resources
- `PUT` - Update resources (full replacement)
- `PATCH` - Update resources (partial)
- `DELETE` - Remove resources

---

## 6. Target Element Requirements

### Page Structure
```html
<!-- Parent page must have element with matching ID -->
<div id="cells-container" class="space-y-4">
  <!-- Initial content -->
</div>
```

### Server Response
```html
<!-- Response MUST include element with same ID -->
<div id="cells-container" class="space-y-4">
  <!-- Updated content -->
</div>
```

**Critical:** The ID must match exactly. Alpine AJAX searches the response DOM for this element.

---

## 7. Multiple Targets

You can update multiple elements from a single request.

```html
<form
  method="POST"
  action="/comments"
  x-target="comments comments_count">
  <textarea name="comment"></textarea>
  <button>Post</button>
</form>

<div id="comments"><!-- Comments list --></div>
<div id="comments_count">5 comments</div>
```

Server must return both elements:
```html
<div id="comments"><!-- Updated list --></div>
<div id="comments_count">6 comments</div>
```

---

## 8. Target Aliases

When element IDs differ between pages, use aliases with colon syntax.

```html
<!-- Replace #modal_body with #page_body from response -->
<a href="/page" x-target="modal_body:page_body">Open in Modal</a>

<div id="modal_body"><!-- Will be replaced --></div>
```

Response contains:
```html
<div id="page_body"><!-- New content --></div>
```

---

## 9. Status-Based Targeting

Handle different HTTP status codes with modifiers.

```html
<form
  action="/update"
  x-target="success_message"
  x-target.422="validation_errors"
  x-target.5xx="server_error">
</form>
```

**Modifiers:**
- `x-target.422` - Unprocessable Entity (validation errors)
- `x-target.4xx` - All 400-level errors
- `x-target.5xx` - All 500-level errors
- `x-target.away` - Redirects to different domain
- `x-target.back` - Redirects to same page

---

## 10. History Management

### Push New Entry
```html
<a href="/page" x-target="content" x-target.push>
```
Creates new browser history entry.

### Replace Current Entry
```html
<a href="/page" x-target="content" x-target.replace>
```
Updates URL without new history entry.

---

## 11. Special Target Keywords

### `_top`
Forces full page reload.
```html
<a href="/page" x-target="_top">Full Reload</a>
```

### `_none`
Prevents any DOM updates (useful for fire-and-forget requests).
```html
<form action="/track" x-target="_none">
```

### Empty value (self-targeting)
Element targets itself. Requires element to have an `id`.
```html
<form id="contact_form" x-target method="POST">
```

---

## 12. Content Type Headers

Always return `text/html` from endpoints.

### ❌ INCORRECT
```typescript
return new Response(JSON.stringify({ data }), {
  headers: { "Content-Type": "application/json" }
});
```

### ✅ CORRECT
```typescript
return new Response(html, {
  headers: { "Content-Type": "text/html" }
});
```

---

## 13. Alpine AJAX Events

Available events for custom handling:

- `@ajax:before` - Before request is sent (can cancel)
- `@ajax:sent` - Request sent
- `@ajax:success` - Successful response received
- `@ajax:error` - Error response received

```html
<div
  @ajax:before="console.log('Sending...')"
  @ajax:success="console.log('Done!')"
  @ajax:error="console.log('Error!')">
  <form x-target="result">...</form>
</div>
```

---

## 14. Autofocus Management

Use `x-autofocus` to manage focus after updates.

```html
<a href="/edit" x-target="form" x-autofocus>Edit</a>
```

After the target updates, Alpine AJAX will focus the first focusable element.

---

## 15. Merge Strategies

By default, Alpine AJAX **replaces** the target element. Use `x-merge` for alternatives.

```html
<!-- Append new content -->
<div id="list" x-merge="append">

<!-- Prepend new content -->
<div id="list" x-merge="prepend">

<!-- Morph (requires Alpine Morph plugin) -->
<div id="list" x-merge="morph">
```

---

## Common Implementation Checklist

Before deploying Alpine AJAX functionality:

- [ ] `x-target` uses ID names, not CSS selectors
- [ ] Server responses include wrapper element with matching ID
- [ ] Confirmation dialogs use `@ajax:before` event
- [ ] Form associations use `form` attribute where needed
- [ ] HTTP methods match semantic meaning (DELETE for delete, etc.)
- [ ] Server endpoints export correct HTTP method handlers
- [ ] Content-Type is `text/html` in responses
- [ ] Forms work without JavaScript (progressive enhancement)
- [ ] Multiple targets return all required elements
- [ ] Status-based targets handle error cases

---

## Debugging Tips

### Check Request Headers
Alpine AJAX adds headers to requests:
- `X-Alpine-Request: true`
- `X-Alpine-Target: target_id`

### Inspect Response
Use browser DevTools Network tab:
1. Check response is HTML, not JSON
2. Verify response contains element with target ID
3. Check HTTP status code matches expected

### Console Logging
```html
<div
  @ajax:before="console.log('Request:', $event.detail)"
  @ajax:success="console.log('Response:', $event.detail)">
```

### Common Errors
- **"Target not found"** - Response HTML missing element with target ID
- **Nothing happens** - Check `x-target` for CSS selector syntax (#, .)
- **Confirmation shows but doesn't work** - Use `@ajax:before` not `@submit.prevent`
- **Form values missing** - Add `form="form-id"` attribute to inputs

---

## Reference Implementation

See `/src/pages/ax-experiment.astro` and `/src/pages/partials/ax-experiment/` for a complete working example following all these patterns.

---

## Official Documentation

Always refer to the official Alpine AJAX documentation for the latest information:
- Main site: https://alpine-ajax.js.org/
- Reference: https://alpine-ajax.js.org/reference/
- Examples: https://alpine-ajax.js.org/examples/
