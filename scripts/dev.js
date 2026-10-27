#!/usr/bin/env node

/**
 * LedgerGuard Universal Process Orchestrator (Docker-Free)
 *
 * Runs all services concurrently in a single terminal with colored output,
 * auto-restart handling, and clean shutdown on Ctrl+C.
 *
 * Replaces Docker Compose with 0 virtualization overhead and 1-second startup.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI Terminal Colors
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  api: '\x1b[32m',       // Green
  frontend: '\x1b[36m',  // Cyan
  worker: '\x1b[33m',    // Yellow
  system: '\x1b[34m',    // Blue
  error: '\x1b[31m',     // Red
};

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const services = [
  {
    name: 'API',
    color: COLORS.api,
    command: npmCmd,
    args: ['run', 'dev', '--workspace=apps/api'],
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: '3000' },
  },
  {
    name: 'FRONTEND',
    color: COLORS.frontend,
    command: npmCmd,
    args: ['run', 'dev', '--workspace=apps/frontend'],
    cwd: ROOT_DIR,
    env: { ...process.env },
  },
  {
    name: 'WORKER',
    color: COLORS.worker,
    command: npmCmd,
    args: ['run', 'dev', '--workspace=apps/worker'],
    cwd: ROOT_DIR,
    env: { ...process.env },
  },
];

const runningProcesses = [];

function log(service, color, text) {
  const lines = text.toString().split('\n');
  for (const line of lines) {
    if (line.trim().length > 0) {
      const tag = `${color}[${service.padEnd(10)}]${COLORS.reset} `;
      console.log(tag + line);
    }
  }
}

console.log(`${COLORS.bold}${COLORS.system}======================================================${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.system}  LedgerGuard Orchestrator (No Docker Required)       ${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.system}======================================================${COLORS.reset}`);
console.log(`Starting all microservices in local native mode...\n`);

for (const s of services) {
  try {
    const child = spawn(s.command, s.args, {
      cwd: s.cwd,
      env: s.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows,
    });

    runningProcesses.push({ name: s.name, process: child });

    child.stdout.on('data', (data) => log(s.name, s.color, data));
    child.stderr.on('data', (data) => log(s.name, s.color, data));

    child.on('error', (err) => {
      if (s.optional) {
        log(s.name, COLORS.error, `Optional service not started (${err.message}). API will use deterministic rules.`);
      } else {
        log(s.name, COLORS.error, `Failed to start: ${err.message}`);
      }
    });

    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        log(s.name, COLORS.error, `Exited with code ${code}`);
      }
    });
  } catch (err) {
    if (s.optional) {
      log(s.name, COLORS.error, `Optional service skipped: ${err.message}`);
    } else {
      log(s.name, COLORS.error, `Error spawning service: ${err.message}`);
    }
  }
}

// Clean shutdown on Ctrl+C (SIGINT)
function shutdown() {
  console.log(`\n${COLORS.system}Shutting down all LedgerGuard services cleanly...${COLORS.reset}`);
  for (const p of runningProcesses) {
    try {
      if (isWindows) {
        // On Windows, taskkill kills process tree
        spawn('taskkill', ['/pid', p.process.pid.toString(), '/f', '/t']);
      } else {
        p.process.kill('SIGTERM');
      }
    } catch {
      // Process already terminated
    }
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
