/**
 * Currency and date formatting utilities for LedgerGuard
 * All monetary amounts are internally represented as integers in paise.
 */

export function formatPaise(paise, options = {}) {
  const num = typeof paise === 'string' ? parseInt(paise, 10) : Number(paise);
  if (isNaN(num)) return '₹0.00';

  const isNegative = num < 0;
  const absPaise = Math.abs(num);
  const rupees = absPaise / 100;

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);

  if (isNegative) {
    return `-${formatted}`;
  }
  return options.showPlus && num > 0 ? `+${formatted}` : formatted;
}

export function paiseToRupees(paise) {
  const num = typeof paise === 'string' ? parseInt(paise, 10) : Number(paise);
  if (isNaN(num)) return 0;
  return num / 100;
}

export function rupeesToPaise(rupees) {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : Number(rupees);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateString);
}
