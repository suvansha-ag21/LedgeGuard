export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { jsonResponse, handleOptions } from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'LedgerGuard Financial Ledger & Risk Engine API',
      description: 'Mission-critical double-entry ledger payments platform with simulated money and real-time AI risk engine.',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local Development Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth_token',
        },
        idempotencyKey: {
          type: 'apiKey',
          in: 'header',
          name: 'Idempotency-Key',
          description: 'Unique client-generated key preventing duplicate money movements',
        },
      },
    },
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Register new user and default wallet',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, role: { type: 'string', enum: ['USER', 'ADMIN'] } } } } },
          },
          responses: { '201': { description: 'User created' } },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Log in and receive JWT cookie & token',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } },
          },
          responses: { '200': { description: 'Authenticated' } },
        },
      },
      '/api/auth/me': {
        get: {
          summary: 'Get current user session and accounts',
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { '200': { description: 'Current profile' } },
        },
      },
      '/api/accounts': {
        get: {
          summary: 'List accounts',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Account list' } },
        },
        post: {
          summary: 'Create new account',
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Account created' } },
        },
      },
      '/api/deposits': {
        post: {
          summary: 'Deposit funds from EXTERNAL_BANK',
          security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
          responses: { '201': { description: 'Deposit completed' } },
        },
      },
      '/api/transfers': {
        post: {
          summary: 'Transfer funds between wallets with AI risk evaluation',
          security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
          responses: { '201': { description: 'Transfer executed or queued for review' } },
        },
      },
      '/api/withdrawals': {
        post: {
          summary: 'Withdraw funds to EXTERNAL_BANK',
          security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
          responses: { '201': { description: 'Withdrawal completed' } },
        },
      },
      '/api/holds': {
        post: {
          summary: 'Create authorization hold',
          security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
          responses: { '201': { description: 'Hold created' } },
        },
      },
      '/api/holds/{id}/capture': {
        post: {
          summary: 'Capture held funds',
          security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
          responses: { '200': { description: 'Hold captured' } },
        },
      },
      '/api/holds/{id}/release': {
        post: {
          summary: 'Release held funds back to sender',
          security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
          responses: { '200': { description: 'Hold released' } },
        },
      },
      '/api/transactions/{id}/refund': {
        post: {
          summary: 'Full or partial transaction refund via linked reversal',
          security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
          responses: { '200': { description: 'Refund completed' } },
        },
      },
      '/api/admin/stats': {
        get: {
          summary: 'Admin dashboard KPI statistics & zero-sum invariant check',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'System metrics' } },
        },
      },
      '/api/admin/reconciliation/run': {
        post: {
          summary: 'Trigger full system-wide financial integrity audit',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Audit result' } },
        },
      },
      '/api/admin/stream': {
        get: {
          summary: 'Server-Sent Events (SSE) live transaction feed',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'SSE text stream' } },
        },
      },
    },
  };

  return jsonResponse(spec);
}
