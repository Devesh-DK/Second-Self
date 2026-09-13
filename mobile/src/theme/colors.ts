export const colors = {
  // Canvas & Backgrounds
  background: '#F8F9FD',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceHover: '#EBF2FC',

  // Google Gemini Brand & Accent Colors
  geminiBlue: '#1A73E8',
  geminiBlueLight: '#E8F0FE',
  geminiIris: '#7C3AED',
  geminiIrisLight: '#F3E8FF',
  geminiSparkle: '#4285F4',
  geminiAmber: '#F59E0B',
  geminiAmberLight: '#FEF3C7',

  // Text Hierarchy
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#EDF2F7',
  borderFocus: '#93C5FD',

  // PARA System Colors (Gemini styled)
  para: {
    Projects: {
      color: '#1D4ED8',
      background: '#EFF6FF',
      border: '#BFDBFE',
      label: 'Projects',
      icon: 'briefcase',
    },
    Areas: {
      color: '#047857',
      background: '#ECFDF5',
      border: '#A7F3D0',
      label: 'Areas',
      icon: 'layers',
    },
    Resources: {
      color: '#6D28D9',
      background: '#F5F3FF',
      border: '#DDD6FE',
      label: 'Resources',
      icon: 'book-open',
    },
    Archives: {
      color: '#475569',
      background: '#F1F5F9',
      border: '#CBD5E1',
      label: 'Archives',
      icon: 'archive',
    },
  },

  // State colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
};

export const shadows = {
  sm: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  geminiPill: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
};
