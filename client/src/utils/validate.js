// Mirrors the server's rules so users get instant feedback.
export function passwordIssue(password) {
  if (!password || password.length < 8) return 'At least 8 characters';
  if (!/[A-Za-z]/.test(password)) return 'Must contain at least one letter';
  if (!/\d/.test(password)) return 'Must contain at least one number';
  return '';
}

export const cleanPhone = phone => String(phone || '').replace(/[\s()-]/g, '');

// E.164-style: +, country code, 8–15 digits in total.
export const isValidPhone = phone => /^\+[1-9]\d{7,14}$/.test(cleanPhone(phone));

export const phoneIssue = phone =>
  !phone || isValidPhone(phone) ? '' : 'Use a valid international number, e.g. +919876543210';
