export const legacyRouteMap = {
  '/login.html': '/login',
  '/register.html': '/register',
  '/forgot-password.html': '/forgot-password',
  '/reset-password.html': '/reset-password',
  '/preview.html': '/app',
  '/admin.html': '/admin',
};

const allowedNext = new Set(['/app', '/admin']);

export function getRedirectTarget() {
  const next = new URLSearchParams(location.search).get('next');
  return allowedNext.has(next) ? next : '/app';
}
