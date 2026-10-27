/**
 * LedgerGuard Global Fishy / Suspicious Activity Alert Dispatcher
 *
 * Dispatches cross-component popups for high-risk scam recipients,
 * phishing collect requests, unfamiliar logins, and anomalous transactions.
 */

export const FISHY_ALERT_EVENT = 'ledgerguard:fishy_alert';

/**
 * Triggers a high-impact Suspicious Activity popup across the application.
 *
 * @param {object} alertData
 * @param {string} alertData.title - Header title for the popup
 * @param {'SCAM_RECIPIENT' | 'PHISHING_COLLECT' | 'ACCOUNT_TAKEOVER' | 'UNUSUAL_SPENDING'} [alertData.category]
 * @param {string} [alertData.recipient] - Payee or counterparty involved
 * @param {string} [alertData.amount] - Formatted amount involved (e.g. "₹4,999.00")
 * @param {string} alertData.reason - Plain-English explanation of why this looks fishy
 * @param {Array<string>} [alertData.signals] - Specific threat indicators
 * @param {string} [alertData.safetyTip] - Consumer security education tip
 * @param {Function} [alertData.onBlock] - Callback when user clicks "Block & Keep Money Safe"
 * @param {Function} [alertData.onProceed] - Callback when user chooses to proceed with verification
 */
export function triggerFishyAlert(alertData) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(FISHY_ALERT_EVENT, {
      detail: alertData,
    })
  );
}
