/**
 * LedgerGuard API Client
 * Configured with credentials: 'include' and automatic Idempotency-Key injection
 */

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Automatically attach Idempotency-Key to POST requests that move money
  if (
    options.method === 'POST' &&
    !headers['Idempotency-Key'] &&
    (endpoint.includes('/transfers') ||
     endpoint.includes('/deposits') ||
     endpoint.includes('/withdrawals') ||
     endpoint.includes('/holds') ||
     endpoint.includes('/refund'))
  ) {
    headers['Idempotency-Key'] = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'API Request Failed');
    throw new ApiError(errorMsg, response.status, data?.code, data?.details);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
  },

  // Accounts
  accounts: {
    list: () => request('/accounts'),
    get: (id) => request(`/accounts/${id}`),
    balance: (id) => request(`/accounts/${id}/balance`),
    statement: (id, params = {}) => {
      const search = new URLSearchParams(params).toString();
      return request(`/accounts/${id}/statement${search ? `?${search}` : ''}`);
    },
    freeze: (id, frozen, reason) =>
      request(`/admin/accounts/${id}/freeze`, {
        method: 'POST',
        body: JSON.stringify({ frozen, reason }),
      }),
  },

  // Money Operations
  money: {
    deposit: (body, key) =>
      request('/deposits', {
        method: 'POST',
        headers: key ? { 'Idempotency-Key': key } : {},
        body: JSON.stringify(body),
      }),
    transfer: (body, key) =>
      request('/transfers', {
        method: 'POST',
        headers: key ? { 'Idempotency-Key': key } : {},
        body: JSON.stringify(body),
      }),
    withdraw: (body, key) =>
      request('/withdrawals', {
        method: 'POST',
        headers: key ? { 'Idempotency-Key': key } : {},
        body: JSON.stringify(body),
      }),
    createHold: (body, key) =>
      request('/holds', {
        method: 'POST',
        headers: key ? { 'Idempotency-Key': key } : {},
        body: JSON.stringify(body),
      }),
    captureHold: (id, body, key) =>
      request(`/holds/${id}/capture`, {
        method: 'POST',
        headers: key ? { 'Idempotency-Key': key } : {},
        body: JSON.stringify(body),
      }),
    releaseHold: (id, body, key) =>
      request(`/holds/${id}/release`, {
        method: 'POST',
        headers: key ? { 'Idempotency-Key': key } : {},
        body: JSON.stringify(body),
      }),
    refund: (txId, body, key) =>
      request(`/transactions/${txId}/refund`, {
        method: 'POST',
        headers: key ? { 'Idempotency-Key': key } : {},
        body: JSON.stringify(body),
      }),
  },

  // Holds
  holds: {
    list: () => request('/holds'),
  },

  // Transactions
  transactions: {
    list: (params = {}) => {
      const search = new URLSearchParams(params).toString();
      return request(`/transactions${search ? `?${search}` : ''}`);
    },
    get: (id) => request(`/transactions/${id}`),
  },

  // Admin
  admin: {
    stats: () => request('/admin/stats'),
    ledger: (params = {}) => {
      const search = new URLSearchParams(params).toString();
      return request(`/admin/ledger${search ? `?${search}` : ''}`);
    },
    reviewQueue: () => request('/admin/review-queue'),
    approveReview: (id) => request(`/admin/review-queue/${id}/approve`, { method: 'POST' }),
    rejectReview: (id, notes) =>
      request(`/admin/review-queue/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    reconciliation: () => request('/admin/reconciliation'),
    runReconciliation: () => request('/admin/reconciliation/run', { method: 'POST' }),
    riskBenchmark: (run = false) => request(`/admin/risk/benchmark${run ? '?run=true' : ''}`),
    runRiskBenchmark: () => request('/admin/risk/benchmark', { method: 'POST' }),
    auditLogs: (params = {}) => {
      const search = new URLSearchParams(params).toString();
      return request(`/admin/audit-logs${search ? `?${search}` : ''}`);
    },
  },
};

export default api;
