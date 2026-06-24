module.exports = {
  apps: [
    {
      name: 'easy-whatsapp-server',
      script: './index.js',
      cwd: './server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4005,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4005,
      },
      out_file: '../logs/server-out.log',
      error_file: '../logs/server-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'easy-whatsapp-client',
      script: 'npm',
      args: 'run dev',
      cwd: './client',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 4176,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4176,
      },
      out_file: '../logs/client-out.log',
      error_file: '../logs/client-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ],
};
