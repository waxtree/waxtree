# Rule 01 — React + Tailwind CSS

## Required

- Always use **React** (`.tsx` components, JSX/TSX).
- Always use **Tailwind CSS** for styling (`className="..."`).
- Do not create standalone `.html` files for app UI.
- Do not add plain CSS in `.css` files for new styles.

## Forbidden

```tsx
// ❌ NO — static HTML file for UI
// login.html, admin.html, etc.

// ❌ NO — plain CSS for new components
// .my-button { background: red; }

// ❌ NO — inline styles as a Tailwind substitute
<div style={{ backgroundColor: 'red' }}>
```

## Correct

```tsx
// ✅ YES — React component with Tailwind
export const LoginForm = () => (
  <form className="flex flex-col gap-4 p-6 rounded-lg bg-zinc-900">
    <input className="px-3 py-2 rounded border border-zinc-700" />
    <button className="px-4 py-2 bg-amber-500 text-black rounded">
      Sign in
    </button>
  </form>
);
```

## Exceptions

- Existing `index.css` (global variables, reset, legacy animations): do not expand it with new styles; prefer Tailwind.
- Files in `api/`: not React UI, this rule does not apply.
