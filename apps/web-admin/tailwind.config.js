import forms from '@tailwindcss/forms';

/** Design tokens lấy từ mockup "AppHotel Admin & Staff Portal". */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'brand-slate': '#1E293B',
        'on-brand-slate': '#F8FAFC',
        'sidebar-surface': '#1E293B',
        'sidebar-active': '#334155',
        'sidebar-muted': '#94A3B8',
        'status-emerald': '#10B981',
        'emerald-tint': '#ECFDF5',
        'on-emerald-tint': '#065F46',
        'status-amber': '#F59E0B',
        'amber-tint': '#FFFBEB',
        'on-amber-tint': '#92400E',
        'status-blue': '#3B82F6',
        'blue-tint': '#EFF6FF',
        'on-blue-tint': '#1E40AF',
        'status-error': '#EF4444',
        'error-tint': '#FEF2F2',
        'on-error-tint': '#991B1B',
        primary: '#2563EB',
        'on-primary': '#FFFFFF',
        surface: '#F8FAFC',
        'on-surface': '#0F172A',
        'surface-low': '#FFFFFF',
        'surface-container': '#F1F5F9',
        'surface-high': '#E2E8F0',
        'on-surface-variant': '#475569',
        outline: '#CBD5E1',
        'outline-variant': '#E2E8F0',
      },
      borderRadius: { sm: '6px', DEFAULT: '8px', md: '12px', lg: '16px', full: '9999px' },
      spacing: {
        'gutter-xs': '4px', 'gutter-sm': '8px', 'gutter-md': '12px', 'gutter-lg': '16px', 'gutter-xl': '20px',
        section: '24px', 'page-margin': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'monospace'],
      },
      fontSize: {
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.5px', fontWeight: '700' }],
        'headline-md': ['18px', { lineHeight: '26px', letterSpacing: '-0.25px', fontWeight: '600' }],
        'title-md': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-lg': ['13px', { lineHeight: '18px', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.1px', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.3px', fontWeight: '600' }],
        'mono-code': ['18px', { lineHeight: '24px', letterSpacing: '1.5px', fontWeight: '600' }],
        'mono-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.2px', fontWeight: '500' }],
      },
      transitionDuration: { 'state-change': '100ms' },
    },
  },
  plugins: [forms],
};
