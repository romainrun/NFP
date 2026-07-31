/**
 * PM2 ecosystem — permanent Expo Metro development server (NFP).
 *
 * Process name : nfp-metro
 * Bind         : 0.0.0.0:8086
 * Mode         : development (--dev-client), not Expo production hosting
 *
 * Logs live under /home/deploy/logs/nfp/ (created by scripts/deploy.sh).
 */
module.exports = {
  apps: [
    {
      name: 'nfp-metro',
      cwd: '/home/deploy/apps/nfp',
      // Shell keeps `npx` resolution identical to a manual SSH session.
      script: 'bash',
      args: [
        '-lc',
        'npx expo start --dev-client --host 0.0.0.0 --port 8086 --clear=false',
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
        CI: '1',
      },
      out_file: '/home/deploy/logs/nfp/metro-out.log',
      error_file: '/home/deploy/logs/nfp/metro-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
};
