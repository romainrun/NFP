/**
 * PM2 ecosystem — permanent Expo Metro development server (NFP).
 *
 * Process name : nfp-metro
 * Port         : 2000
 * Host mode    : lan (Expo only allows lan | tunnel | localhost)
 *
 * Same PM2 style as expo-json2026 / expo-xml2026 on this VPS:
 * a small shell entrypoint restored by PM2.
 */
const path = require('path');
const os = require('os');

const appDir = __dirname;
const logDir = path.join(os.homedir(), 'logs', 'nfp');

module.exports = {
  apps: [
    {
      name: 'nfp-metro',
      cwd: appDir,
      script: path.join(appDir, 'scripts', 'run-metro-pm2.sh'),
      interpreter: 'bash',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 30,
      min_uptime: '10s',
      restart_delay: 3_000,
      kill_timeout: 8_000,
      exp_backoff_restart_delay: 200,
      env: {
        NODE_ENV: 'development',
        HOST_MODE: 'lan',
        METRO_PORT: '2000',
        EXPO_NO_TELEMETRY: '1',
        EXPO_NO_DOCTOR: '1',
        CI: 'true',
      },
      out_file: path.join(logDir, 'metro-out.log'),
      error_file: path.join(logDir, 'metro-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
};
