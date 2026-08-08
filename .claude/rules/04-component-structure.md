# Rule 04 — One component per file, organized folders

## Required

- **One React component per file.**
- Each file exports one main component.
- Split complex UI into sub-components, each in its own file.
- Organize files in folders based on **route** or **action type**.

## Folder structure

```
src/
  pages/                    # 1 file = 1 page (bound to a route)
    LandingPage.tsx
    AppPage.tsx
    AuthPages.tsx           # ⚠ split if it contains multiple pages

  components/               # reusable components
    SearchPanel.tsx
    ArtistNode.tsx
    BrandMark.tsx

  components/auth/          # components for a specific area/action
    LoginForm.tsx
    RegisterForm.tsx

  components/admin/         # admin-only components
    UserTable.tsx
    StatsCard.tsx

  lib/                      # logic, hooks, utilities (no UI)
    auth.tsx
    routes.ts
```

## Forbidden

```tsx
// ❌ NO — multiple components in the same file
// src/pages/AuthPages.tsx

const LoginForm = () => { ... };
const RegisterForm = () => { ... };
const ForgotPasswordForm = () => { ... };

export const AuthPages = () => { ... };
```

## Correct

```
src/
  pages/
    LoginPage.tsx           # export const LoginPage
  components/auth/
    LoginForm.tsx           # export const LoginForm
    RegisterForm.tsx        # export const RegisterForm
    ForgotPasswordForm.tsx  # export const ForgotPasswordForm
```

```tsx
// src/pages/LoginPage.tsx
import { LoginForm } from '../components/auth/LoginForm';

export const LoginPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoginForm />
  </div>
);
```

## Naming conventions

| Type | Folder | File name | Export |
|------|--------|-----------|--------|
| Route page | `src/pages/` | `NamePage.tsx` | `export const NamePage` |
| UI component | `src/components/` or subfolder | `ComponentName.tsx` | `export const ComponentName` |
| Hook / logic | `src/lib/` | `useName.ts` or `name.ts` | `export const useName` |

## When to create a subfolder

Create `src/components/<area>/` when:
- Components serve only one route or feature (e.g. `auth/`, `admin/`, `search/`)
- You have 2+ components related to the same action
- The feature is likely to grow over time
