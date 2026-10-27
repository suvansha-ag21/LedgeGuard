import pino from 'pino';

const isBrowser = typeof window !== 'undefined' || typeof process === 'undefined';
const envLogLevel = (!isBrowser && typeof process !== 'undefined' && process.env?.LOG_LEVEL)
  ? process.env.LOG_LEVEL
  : 'info';

export const logger = isBrowser
  ? {
      info: (...args) => console.log('[INFO]', ...args),
      warn: (...args) => console.warn('[WARN]', ...args),
      error: (...args) => console.error('[ERROR]', ...args),
      debug: (...args) => console.debug('[DEBUG]', ...args),
      fatal: (...args) => console.error('[FATAL]', ...args),
      trace: (...args) => console.trace('[TRACE]', ...args),
      child: () => logger,
    }
  : pino({
      name: 'ledgerguard-core',
      level: envLogLevel,
      formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });

export default logger;

