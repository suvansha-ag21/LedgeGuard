/**
 * Financial Ledger Domain Errors
 */

export class LedgerError extends Error {
  constructor(message, statusCode = 400, code = 'LEDGER_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class InsufficientFundsError extends LedgerError {
  constructor(message = 'Insufficient funds in source account') {
    super(message, 400, 'INSUFFICIENT_FUNDS');
  }
}

export class AccountFrozenError extends LedgerError {
  constructor(message = 'Account is frozen and cannot transact') {
    super(message, 403, 'ACCOUNT_FROZEN');
  }
}

export class AccountNotFoundError extends LedgerError {
  constructor(message = 'Account not found') {
    super(message, 404, 'ACCOUNT_NOT_FOUND');
  }
}

export class InvalidAmountError extends LedgerError {
  constructor(message = 'Amount must be a positive safe integer in paise') {
    super(message, 422, 'INVALID_AMOUNT');
  }
}

export class IdempotencyConflictError extends LedgerError {
  constructor(message = 'Concurrent request with the same idempotency key is currently processing') {
    super(message, 409, 'IDEMPOTENCY_CONFLICT');
  }
}

export class IdempotencyMismatchError extends LedgerError {
  constructor(message = 'Idempotency key reused with different request payload') {
    super(message, 422, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
  }
}

export class DeadlockExhaustionError extends LedgerError {
  constructor(message = 'Transaction aborted due to concurrent lock contention after maximum retries') {
    super(message, 503, 'LOCK_CONTENTION_TIMEOUT');
  }
}
