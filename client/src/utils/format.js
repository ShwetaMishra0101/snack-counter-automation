export const money = (amount, currency) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount || 0);

export const time = iso =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const dateTime = iso => new Date(iso).toLocaleString();
