import dotenv from 'dotenv';
import { client, connectDB } from './bot';
import { startServer } from './server';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const main = async () => {
  try {
    logger.info('🚀 Starting VRChat Sponsor Bot...');
    
    // 1. Start Web Server
    logger.info('Step 1/3: Starting web server...');
    startServer();
    logger.success('Web server started');

    // 2. Connect to Database
    logger.info('Step 2/3: Connecting to database...');
    await connectDB();
    logger.success('Database connected');

    // 3. Login Bot
    logger.info('Step 3/3: Logging in to Discord...');
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      logger.error('❌ DISCORD_TOKEN is missing');
      process.exit(1);
    }

    await client.login(token);
    logger.success('Discord login successful');
  } catch (error) {
    logger.error('Error during startup:', error);
    throw error;
  }
};

// 🔧 全局错误处理：未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logger.error('Stack:', error.stack);
  // 不立即退出，给 Bot 继续运行的机会
});

// 🔧 全局错误处理：未捕获的 Promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  // 不立即退出，给 Bot 继续运行的机会
});

// 🔧 优雅关闭：处理 SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
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
