import { logger } from './logger';

/**
 * 验证必需的环境变量
 * @throws Error 如果缺少必需的环境变量
 */
export function validateEnv(): void {
  const isDev = process.env.NODE_ENV === 'development';
  const required = isDev ? ['MONGO_URI', 'DISCORD_CLIENT_SECRET', 'JWT_SECRET'] : ['DISCORD_TOKEN', 'CLIENT_ID', 'MONGO_URI', 'DISCORD_CLIENT_SECRET', 'JWT_SECRET'];
  const optionalInDev = ['DISCORD_TOKEN', 'CLIENT_ID'];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (isDev) {
    optionalInDev.forEach(key => {
      if (!process.env[key]) {
        logger.warn(`Optional environment variable ${key} is missing in development mode. Discord features will be disabled.`);
      }
    });
  }
  
  logger.info('');
  logger.info('[Environment]');
  logger.success('Environment variables validated');
}
