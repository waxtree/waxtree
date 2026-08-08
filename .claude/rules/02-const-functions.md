# Rule 02 — Never `function`, always `const`

## Required

Never use the `function` keyword. Declare **everything** with `const`:

- React components
- Custom hooks
- Helper functions
- Event handlers
- Async functions

## Forbidden

```tsx
// ❌ NO
function MyComponent() {
  return <div />;
}

function handleClick() {}

async function fetchData() {}

export function useAuth() {}
```

## Correct

```tsx
// ✅ YES — component
export const MyComponent = () => {
  return <div />;
};

// ✅ YES — handler
const handleClick = () => {};

// ✅ YES — async
const fetchData = async () => {};

// ✅ YES — custom hook
export const useAuth = () => {
  // ...
};
```

## Notes

- Use `export const` for named exports.
- For default export: `const Page = () => { ... }; export default Page;`
- Arrow functions for components and functions are the project standard.
