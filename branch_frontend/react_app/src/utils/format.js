// src/utils/format.js
export const fmtINR     = (n) => n >= 1e5 ? `Rs.${(n/1e5).toFixed(1)}L` : `Rs.${(n/1e3).toFixed(0)}K`
export const fmtINRFull = (n) => 'Rs.' + Math.round(n).toLocaleString('en-IN')
export const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export const ZONE_COLORS = {
  commercial:  { bg: 'var(--blue-dim)',   text: 'var(--blue)'   },
  transport:   { bg: 'var(--amber-dim)',  text: 'var(--amber)'  },
  residential: { bg: 'var(--accent-dim)', text: 'var(--accent)' },
  educational: { bg: 'var(--violet-dim)', text: 'var(--violet)' },
}
export const ATM_ZONES = {
  'Airport ATM':        'transport',
  'Big Street ATM':     'commercial',
  'Christ College ATM': 'educational',
  'KK Nagar ATM':       'residential',
  'Mount Road ATM':     'commercial',
}
export const ATM_MISSING = {
  'Airport ATM': 211, 'Mount Road ATM': 208,
  'Big Street ATM': 110, 'Christ College ATM': 109, 'KK Nagar ATM': 93,
}
