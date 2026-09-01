export const colors = {
  ink: '#292521',
  inkSoft: '#625a52',
  muted: '#968b82',
  paper: '#F7F3EE',
  card: '#FFFDF9',
  line: '#E9E1D8',
  clay: '#B86F5D',
  clayDark: '#8B4F42',
  blush: '#E7B6A7',
  blushSoft: '#F3DDD5',
  sage: '#AAB7A1',
  sageSoft: '#E2E9DF',
  gold: '#B78A52',
  cream: '#F1E9DE',
  white: '#FFFFFF',
  success: '#587A5C',
  danger: '#A14D4D',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const typography = {
  display: 'Georgia',
  body: 'System',
} as const;

export const shadows = {
  soft: {
    boxShadow: '0px 8px 18px rgba(93, 73, 56, 0.08)',
  },
} as const;
