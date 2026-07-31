/**
 * PM2 ecosystem — permanent Expo Metro development server (NFP).
 *
 * Process name : nfp-metro
 * Bind         : 0.0.0.0:2000
 * Mode         : development Metro (not Expo production hosting)
 *
 * Paths follow the SSH user home ($HOME/logs/nfp).
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const appDir = __dirname;
const logDir = path.join(os.homedir(), 'logs', 'nfp');

// Prefer the local Expo CLI binary (same pattern as other VPS Expo apps).
const expoCliCandidates = [
  path.join(appDir, 'node_modules', 'expo', 'bin', 'cli'),
  path.join(appDir, 'node_modules', 'expo', 'bin', 'cli.js'),
];
const expoCli =
  expoCliCandidates.find((candidate) => fs.existsSync(candidate)) ||
  path.join(appDir, 'node_modules', 'expo', 'bin', 'cli');

module.exports = {
  apps: [
    {
      name: 'nfp-metro',
      cwd: appDir,
      script: expoCli,
      interpreter: 'node',
      args: [
        'start',
        '--host',
        '0.0.0.0',
        '--port',
        '2000',
      ],
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 3_000,
      kill_timeout: 8_000,
      exp_backoff_restart_delay: 200,
      env: {
        NODE_ENV: 'development',
        EXPO_NO_TELEMETRY: '1',
        // Keep Metro non-interactive under PM2 (no prompts).
        CI: 'true',
        EXPO_NO_DOCTOR: '1',
      },
      out_file: path.join(logDir, 'metro-out.log'),
      error_file: path.join(logDir, 'metro-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
};
