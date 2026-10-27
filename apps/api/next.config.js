import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure single worker thread on Windows to prevent concurrent directory lock collisions
process.env.NEXT_CPU_NUM = process.env.NEXT_CPU_NUM || '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure API-only backend; no React frontend rendering needed here
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.parallelism = 1;
    config.cache = false;
    return config;
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  serverExternalPackages: ['pg', 'pino', 'bcryptjs'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.FRONTEND_URL || 'http://localhost:5173' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Idempotency-Key',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
