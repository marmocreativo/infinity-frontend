const KEY = 'impersonating';

/** Sesión "Ver como": un administrador entró a esta app como otro usuario */
export const impersonation = {
  start(adminLabel: string) {
    localStorage.setItem(KEY, JSON.stringify({ since: Date.now(), label: adminLabel }));
  },

  isActive(): boolean {
    return !!localStorage.getItem(KEY);
  },

  clear() {
    localStorage.removeItem(KEY);
  },
};
