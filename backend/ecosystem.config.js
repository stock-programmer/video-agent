/**
 * PM2 Ecosystem Configuration File
 *
 * 用于管理 Video Maker 后端服务
 *
 * 使用方法:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'video-maker-backend',
      script: './src/server.js',

      // 实例数量 (0 = CPU 核心数)
      instances: 1,

      // 集群模式
      exec_mode: 'fork',

      // 自动重启配置
      autorestart: true,
      watch: false,  // 生产环境不建议开启文件监听

      // 最大内存限制 (超过后自动重启)
      max_memory_restart: '1G',

      // 环境变量
      env: {
        NODE_ENV: 'production',
      },

      env_development: {
        NODE_ENV: 'development',
      },

      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,  // 日志时间戳

      // 日志轮转
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 进程管理
      min_uptime: '10s',  // 最小运行时间，用于判断是否异常重启
      max_restarts: 10,   // 最大重启次数

      // 监听文件更改 (开发环境可以开启)
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],

      // 优雅关闭
      kill_timeout: 5000,  // 5秒后强制关闭
      wait_ready: true,    // 等待应用发送 ready 信号
      listen_timeout: 10000,  // 监听超时时间

      // Cron 重启 (可选，每天凌晨3点重启)
      // cron_restart: '0 3 * * *',

      // 合并日志
      merge_logs: true,

      // 启动延迟
      // restart_delay: 4000,
    }
  ],

  /**
   * 部署配置 (可选)
   *
   * 使用 pm2 deploy 命令进行远程部署
   */
  deploy: {
    production: {
      user: 'root',
      host: 'your_server_ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/video-maker.git',
      path: '/opt/video-maker',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
