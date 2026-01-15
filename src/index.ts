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

    // 3. Login Bot and wait for ready
    await client.login(process.env.DISCORD_TOKEN!);
    
    // Wait for client to be fully ready
    await new Promise<void>((resolve) => {
      if (client.isReady()) {
        resolve();
      } else {
        client.once('clientReady', () => resolve());
      }
    });
    
    // 4. Perform Health Check
    await performStartupHealthCheck();
    
    logger.info('');
    logger.info('[Ready]');
    logger.success('Bot is ready!');
    logger.success('Server started successfully!');
    
    // Auto-update Cloudflare Worker if configured
    await updateCloudflareWorker();
  } catch (error) {
    logger.error('Error during startup:', error);
    throw error;
  }
}

/**
 * 启动后健康检查
 * 验证所有关键服务正常运行
 */
async function performStartupHealthCheck(): Promise<void> {
  // 检查数据库连接
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected');
  }
  
  // 检查 Discord 连接
  if (!client.isReady()) {
    throw new Error('Discord client not ready');
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

// 🔧 监控进程退出
process.on('exit', (code) => {
  logger.warn(`Process exiting with code: ${code}`);
});

// 🔧 其他信号
process.on('SIGHUP', () => {
  logger.warn('Received SIGHUP signal');
});

process.on('SIGQUIT', () => {
  logger.warn('Received SIGQUIT signal');
});

// 🔧 优雅关闭：统一处理函数
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await client.destroy();
    logger.success('Discord client disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// 🔧 优雅关闭：处理 SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  if (process.env.NODE_ENV === 'development') {
    console.trace();
  }
  await gracefulShutdown('SIGINT');
});

// 🔧 优雅关闭：处理 SIGTERM
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

main().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});
