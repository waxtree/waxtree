export const legacyRouteMap: Record<string, string> = {
  '/login.html': '/login',
  '/register.html': '/register',
  '/forgot-password.html': '/forgot-password',
  '/reset-password.html': '/reset-password',
  '/preview.html': '/app',
  '/admin.html': '/admin',
};

const allowedNext = new Set(['/app', '/admin']);

export function normalizeNext(value: string | null | undefined) {
  if (!value) return '/app';
  const htmlMapped = legacyRouteMap[value];
  if (htmlMapped && allowedNext.has(htmlMapped)) return htmlMapped;
  if (allowedNext.has(value)) return value;
  return '/app';
}
