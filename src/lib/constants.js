export const LANGS = [
  { k: 'da', label: 'Dari', dir: 'rtl', lang: 'fa-AF' },
  { k: 'ps', label: 'Pashto', dir: 'rtl', lang: 'ps' },
  { k: 'en', label: 'English', dir: 'ltr', lang: 'en' }
];
export const STEPS = [
  ['extracting', 'Preparing video audio'],
  ['analyzing', 'Listening and analyzing'],
  ['rendering', 'Rendering branded clips']
];
export const PLATFORMS = { instagram: 'Instagram', x: 'X', facebook: 'Facebook', telegram: 'Telegram' };
export const X_LIMIT = 280;
export const FORMATS = {
  vertical: { short: '9:16', name: 'Vertical', use: 'Reels, TikTok, Stories' },
  square: { short: '1:1', name: 'Square', use: 'Instagram, Facebook' },
  landscape: { short: '16:9', name: 'Landscape', use: 'YouTube, X' }
};
export const FINAL_STATUSES = ['done', 'error'];
export const isFinal = (status) => FINAL_STATUSES.includes(status);
export const STATUS_LABEL = { queued: 'Queued', extracting: 'Processing', analyzing: 'Processing', rendering: 'Rendering', error: 'Failed' };
