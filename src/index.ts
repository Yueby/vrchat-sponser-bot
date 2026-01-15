import dotenv from 'dotenv';
import { client, connectDB } from './bot';
import { startServer } from './server';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const main = async () => {
  try {
    logger.info('🚀 Starting VRChat Sponsor Bot...');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 1. Start Web Server
    logger.info('Step 1/3: Starting web server...');
    startServer();
    // 等待服务器启动
    await new Promise(resolve => setTimeout(resolve, 1000));
    logger.success('Web server initialized');

    // 2. Connect to Database
    logger.info('Step 2/3: Connecting to database...');
    await connectDB();
    logger.success('Database connected');

    // 3. Login Bot
    logger.info('Step 3/3: Logging in to Discord...');
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      logger.error('DISCORD_TOKEN is missing');
      process.exit(1);
    }

    await client.login(token);
    logger.success('Discord login successful');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.success('ALL SYSTEMS ONLINE - BOT IS READY!');
    logger.success('Server started successfully!'); // 平台可能检查这个
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 🔔 保持活动：定期输出心跳日志（防止平台认为无响应）
    setInterval(() => {
      logger.info(`💖 Heartbeat: Bot is running (${client.guilds.cache.size} servers)`);
    }, 30000); // 每 30 秒
  } catch (error) {
    logger.error('Error during startup:', error);
    throw error;
  }
};

// 🔧 全局错误处理：未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  logger.error('Stack:', error.stack);
  logger.error('This should not happen! Please report this bug.');
  // 不立即退出，给 Bot 继续运行的机会
});

// 🔧 全局错误处理：未捕获的 Promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Promise Rejection at:', promise);
  logger.error('Reason:', reason);
  logger.error('This should not happen! Please report this bug.');
  // 不立即退出，给 Bot 继续运行的机会
});

// 🔧 监控进程退出
process.on('exit', (code) => {
  logger.warn(`⚠️ Process exiting with code: ${code}`);
});

// 🔧 其他信号
process.on('SIGHUP', () => {
  logger.warn('⚠️ Received SIGHUP signal');
});

process.on('SIGQUIT', () => {
  logger.warn('⚠️ Received SIGQUIT signal');
});

// 🔧 优雅关闭：处理 SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  logger.warn('⚠️ Received SIGINT signal - shutting down gracefully...');
  logger.info('Stack trace for debugging:');
  console.trace();
  try {
    await client.destroy();
    logger.success('Discord client disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// 🔧 优雅关闭：处理 SIGTERM
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  try {
    await client.destroy();
    logger.success('Discord client disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

main().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});
