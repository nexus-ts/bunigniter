# Template Engine Guide

NexusTS uses **Rendu** as its primary template engine — a PHP-style syntax engine that compiles templates to JavaScript at runtime. On top of Rendu, NexusTS adds **auto-layouts**, **partial includes**, **MDX support**, and **multiple named slots**.

---

## Quick Comparison

| Feature | PHP (CodeIgniter) | NexusTS (Rendu) |
|---------|-------------------|-----------------|
| Output variable | `<?= $title ?>` | `<?= title ?>` |
| Escaped output | `<?= htmlspecialchars($x) ?>` | `{{ x }}` |
| Raw output | — | `{{{ x }}}` |
| Control flow | `<?php if(...) { ?>` | `<?js if(...) { ?>` |
| Template file | `views/about.php` | `views/about.html` |
| Layout | `extends 'layout'` | Auto `_layout.html` |
| Partial include | `include 'footer'` | `include('_footer.html')` |
| Loop | `<?php foreach($items as $i) ?>` | `<?js for (const i of items) { ?>` |

---

## Template Syntax

### 1. Output a variable (PHP-style) — `<?= expr ?>`

```html
<h1><?= title ?></h1>
<p>Total: <?= total ?> todos</p>
```

### 2. Escaped output (Jinja-style) — `{{ expr }}`

```html
<h1>{{ title }}</h1>     <!-- auto-escaped: & < > " -->
```

`{{ }}` internally calls `htmlspecialchars()` (XSS-safe). For raw HTML output, use `{{{ }}}`.

### 3. Raw output — `{{{ expr }}}`

```html
<div>{{{ rawHtmlContent }}}</div>   <!-- no escaping -->
```

### 4. JavaScript control flow — `<?js code ?>`

```html
<ul>
<?js for (const todo of todos) { ?>
  <li><?= todo.title ?></li>
<?js } ?>
</ul>
```

```html
<?js if (user) { ?>
  <p>Welcome, <?= user.name ?></p>
<?js } else { ?>
  <p>Please log in</p>
<?js } ?>
```

### 5. Comments — `<?js /* comment */ ?>`

```html
<?js /* This won't appear in output */ ?>
```

---

## File Resolution Order

When `this.view('name', props)` is called, NexusTS looks for files in this order:

```
views/name.tsx    → React SSR component (JSX)
views/name.mdx    → Markdown + Rendu interpolation
views/name.md     → Markdown (alias for .mdx)
views/name.html   → Rendu template (PHP-style)
views/name/index.tsx → React SSR (subdirectory)
```

---

## Layout System (Astro/Remix style)

### Auto-detection

Place `_layout.html` in the `views/` directory. Every template in that directory is **automatically wrapped** with the layout.

```
views/
├── _layout.html      ← auto-detected, wraps all templates below
├── welcome.html
├── About.mdx
└── _copyright.html   ← partial (starts with _)
```

### Single slot (default)

The rendered page content is injected via `<?= slot ?>`:

```html
<!-- views/_layout.html -->
<!DOCTYPE html>
<html>
<head><title><?= title ?? 'My App' ?></title></head>
<body>
  <nav><!-- ... --></nav>
  <main><?= slot ?></main>       ← page content goes here
  <footer>&copy; 2026</footer>
</body>
</html>
```

### Named slots (Django-style `{% block %}`)

Use any `<?= slot_NAME ?>` in the layout, and pass values from the controller:

```html
<!-- views/_layout.html -->
<header><?= slot_header ?? '' ?></header>
<nav><?= slot_nav ?? '' ?></nav>
<main><?= slot ?></main>
<aside><?= slot_sidebar ?? '' ?></aside>
<footer><?= slot_footer ?? '' ?></footer>
```

```ts
// Controller
return this.view('welcome', {
  title: 'Dashboard',
  slot_header: '<h1>Welcome</h1>',
  slot_sidebar: '<aside>Quick links...</aside>',
  slot_footer: 'Custom footer text',
})
```

Slots are optional — use `?? ''` for a safe default.

---

## Partial Includes

Include sub-templates anywhere using `include('filename')`:

```html
<!-- welcome.html -->
<h1>Welcome</h1>
<?= await include('_copyright.html') ?>
```

Partial files conventionally start with `_` (underscore) but this is not required.

Supports both `.html` and `.mdx` partials. The partial is rendered with the same props as the parent template.

---

## MDX Templates (Markdown + Rendu)

`.mdx` files combine **Markdown** formatting with **Rendu PHP-style** interpolation:

```mdx
# About Us

**Total users:** <?= total ?> (<?= active ?> active)

## Features

- **Fast** — Bun-native runtime
- **Simple** — PHP-style templates
- **Flexible** — React SSR + MDX + Rendu

<?= await include('_copyright.html') ?>
```

Features:
- Full GitHub-Flavored Markdown (tables, code blocks, lists, bold, links)
- `<?= expr ?>` and `{{ expr }}` interpolation (via Rendu pre-processing)
- `include()` support for partials
- Auto-wrapped by `_layout.html`

### MDX rendering pipeline

```
1. Read .mdx file
2. Replace include() calls with pre-rendered partial HTML
3. Escape <?= inside backtick code blocks (so code examples work)
4. Rendu interpolates <?= ?> and {{ }}
5. Content is split at include boundaries
6. Markdown parts → Bun.markdown.react() → React → HTML
7. Include parts → inserted as raw HTML
8. _layout.html wraps the complete result via slot
```

---

## React SSR Templates

`.tsx` files are full React components, SSR-rendered with `react-dom/server`:

```tsx
// views/TodoList.tsx
export default function TodoList({ todos }: { todos: any[] }) {
  return (
    <div>
      <h1>📋 Todo App</h1>
      <ul>{todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>
    </div>
  )
}
```

React templates do NOT use Rendu or auto-layout. They are rendered independently.

---

## Template Engine Priority

When a controller calls `this.view('About', props)`, the engine checks files in priority order:

```
1. views/About.tsx    → React SSR
2. views/About.mdx    → MDX + Rendu
3. views/About.md     → MDX (alias)
4. views/About.html   → Rendu only
5. views/about/index.tsx → React SSR (subdir)
```

Only the first match is used. This lets you upgrade from `.html` to `.mdx` to `.tsx` without changing controller code.

---

## Props from Controller

All props passed to `this.view()` are available in the template:

```ts
// Controller
return this.view('About', {
  total: 8,
  active: 4,
  completed: 4,
  uptime: '15s',
  title: 'About Us',
})
```

```html
<!-- template -->
<h1><?= title ?></h1>
<p><?= total ?> todos (<?= active ?> active)</p>
```

---

## Rendering Pipeline Summary

```
Controller
  │
  └─ this.view('name', props)
       │
       ├─ views/name.tsx    → React.createElement() → renderToString() → HTML
       │
       ├─ views/name.mdx    → Rendu (<?= ?>) → Bun.markdown.react() → HTML
       │                        → include() partials interleaved
       │                        → _layout.html wrapping
       │
       └─ views/name.html   → Rendu (<?= ?>, {{ }}) → HTML
                                → include() partials
                                → _layout.html wrapping
```

---

## Example Files

See `examples/todo-app/views/` for working examples:

| File | Type | Features Demonstrated |
|------|------|----------------------|
| `_layout.html` | Layout | Nav, footer, `<?= slot ?>` named slots |
| `welcome.html` | Rendu | `<?= ?>`, props from controller, auto-layout |
| `About.mdx` | MDX+Rendu | Markdown, `<?= ?>`, `include()`, auto-layout |
| `_copyright.html` | Partial | Included by other templates |
| `TodoList.tsx` | React SSR | Full React component (not in views/) |
