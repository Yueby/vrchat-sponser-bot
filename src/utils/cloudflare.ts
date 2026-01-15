import { logger } from './logger';

// 存储当前的 Replit URL，供 Worker 查询
let currentReplitUrl: string | null = null;

/**
 * 获取当前的 Replit URL
 * 供 API 端点使用，让 Cloudflare Worker 查询
 */
export function getCurrentReplitUrl(): string | null {
  return currentReplitUrl;
}

/**
 * 注册当前 Replit URL
 * Worker 会通过 /__replit_url 端点自动获取最新 URL
 */
export async function updateCloudflareWorker(): Promise<void> {
  const CLOUDFLARE_WORKER_NAME = process.env.CLOUDFLARE_WORKER_NAME;
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  
  // 获取当前 Replit URL
  const replitUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : null;
    
  if (!replitUrl) {
    logger.warn('⚠️ Cannot detect Replit URL');
    return;
  }
  
  // 保存到内存，供 Worker 查询
  currentReplitUrl = replitUrl;
  
  logger.success('✅ Replit URL registered for Cloudflare Worker');
  logger.info(`   Current URL: ${replitUrl}`);
  logger.info(`   Query endpoint: ${replitUrl}/__replit_url`);
  
  // 如果配置了 Worker 信息，显示访问地址
  if (CLOUDFLARE_WORKER_NAME && CLOUDFLARE_ACCOUNT_ID) {
    const workerUrl = `https://${CLOUDFLARE_WORKER_NAME}.${CLOUDFLARE_ACCOUNT_ID}.workers.dev`;
    logger.info(`   Worker URL: ${workerUrl}`);
    logger.info(`💡 Worker will automatically fetch the latest URL from /__replit_url endpoint`);
  } else {
    logger.info(`💡 Set CLOUDFLARE_WORKER_NAME and CLOUDFLARE_ACCOUNT_ID to see Worker URL`);
  }
}
