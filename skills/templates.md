# Templates — 3 Engines

## Rendu (PHP-style) — `.html`

```html
<h1><?= title ?></h1>
<? for (const item of items) { ?>
  <li><?= item.name ?></li>
<? } ?>
<? if (user) { ?><p>Welcome</p><? } ?>
```

## MDX (Markdown + variables) — `.mdx`

```mdx
# About

**Stats:** {{ total }} todos ({{ active }} active)
```

## React SSR — `.tsx`

```tsx
export default function Posts({ posts }: any) {
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

## Layout

- `views/_layout.html` auto-wraps all pages
- `<?= slot ?>` — page content goes here
- Named slots: `<?= slot_sidebar ?? '' ?>`

## Resolution Order

`.tsx` → `.mdx` → `.md` → `.html` → `index.tsx`

## Partial Includes

```html
<?= include('_copyright.html') ?>
```
