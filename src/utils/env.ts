import { logger } from './logger';

/**
 * 验证必需的环境变量
 * @throws Error 如果缺少必需的环境变量
 */
export function validateEnv(): void {
  const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'MONGO_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  logger.info('Environment variables validated');
}
