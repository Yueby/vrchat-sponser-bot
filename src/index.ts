import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { client, connectDB } from './bot';
import { startServer } from './server';
import { updateCloudflareWorker } from './utils/cloudflare';
import { validateEnv } from './utils/env';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

async function main(): Promise<void> {
  try {
    // Validate environment variables first
    validateEnv();
    
    logger.info('');
    logger.info('[VRChat Sponsor Bot]');
    
    // 1. Start Web Server
    startServer();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Connect to Database
    await connectDB();

    const isDev = process.env.NODE_ENV === 'development';
    const hasToken = !!process.env.DISCORD_TOKEN;

    // 3. Login Bot and wait for ready (Only if not dev or has token)
    if (!isDev || hasToken) {
      await client.login(process.env.DISCORD_TOKEN!);
      
      // Wait for client to be fully ready
      await new Promise<void>((resolve) => {
        if (client.isReady()) {
          resolve();
        } else {
          client.once('clientReady', () => resolve());
        }
      });
      

    } else {
      logger.warn('Skipping Discord login in development mode (No Token provided)');
    }
    
    logger.info('');
    logger.info('[Ready]');
    logger.success('Bot is ready!');
    logger.success('Server started successfully!');
    
    // Auto-update Cloudflare Worker if configured
    if (!isDev || hasToken) {
      await updateCloudflareWorker();
    }
  } catch (error) {
    logger.error('Error during startup:', error);
    throw error;
  }
}


// 🔧 全局错误处理：未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logger.error('Stack:', error.stack);
  logger.error('This should not happen! Please report this bug.');
  // 不立即退出，给 Bot 继续运行的机会
});

// 🔧 全局错误处理：未捕获的 Promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', promise);
  logger.error('Reason:', reason);
  logger.error('This should not happen! Please report this bug.');
  // 不立即退出，给 Bot 继续运行的机会
});

// 🔧 优雅关闭处理
const handleShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await client.destroy();
    logger.success('Discord client disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));


main().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});
