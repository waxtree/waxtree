// Signs out and clears every Supabase auth key left in this browser, then
// sends the person to the login page. Shared by the header menu and the
// onboarding gate (which hides the header, so needs its own way out).
export const signOut = async actions => {
  await actions.supabase.auth.signOut();
  Object.keys(localStorage).filter(key => key.startsWith('sb-')).forEach(key => localStorage.removeItem(key));
  window.location.href = '/login';
};
