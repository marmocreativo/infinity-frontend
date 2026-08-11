// Design tokens compartidos entre Cliente, Admin y Mensajero
// Fuente única de verdad para colores, tipografía y espaciado

export const colors = {
  primary: '#7C3AED',        // púrpura principal
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',

  accent: '#F59E0B',         // acento complementario (naranja/ámbar)

  base: {
    darkNavy: '#0F172A',
    dark: '#1E293B',
    light: '#F8FAFC',
    white: '#FFFFFF',
  },

  status: {
    pending: '#94A3B8',
    assigned: '#3B82F6',
    enRoute: '#F59E0B',
    delivered: '#10B981',
    cancelled: '#EF4444',
  },

  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    onDark: '#F8FAFC',
  },
} as const;

export const typography = {
  fontFamily: {
    heading: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const;

export const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
} as const;
