import { logger } from './logger';

// 存储当前的 Replit URL，供 Worker 查询（备用方案）
let currentReplitUrl: string | null = null;

/**
 * 获取当前的 Replit URL
 * 供 API 端点使用，让 Cloudflare Worker 查询
 */
export function getCurrentReplitUrl(): string | null {
  return currentReplitUrl;
}

/**
 * 获取 Cloudflare Workers.dev 子域名
 */
async function getWorkersSubdomain(accountId: string, apiToken: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json() as any;
    return data.result?.subdomain || null;
  } catch (error) {
    return null;
  }
}

/**
 * 自动更新 Cloudflare Worker 环境变量
 * 使用 Cloudflare API 直接更新 Worker 的环境变量
 */
export async function updateCloudflareWorker(): Promise<void> {
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CLOUDFLARE_WORKER_NAME = process.env.CLOUDFLARE_WORKER_NAME;
  
  // 获取当前 Replit URL
  const replitUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : null;
    
  if (!replitUrl) {
    logger.warn('⚠️ Cannot detect Replit URL');
    return;
  }
  
  // 保存到内存（备用方案）
  currentReplitUrl = replitUrl;
  
  // 检查是否配置了 Cloudflare
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKER_NAME) {
    logger.info('ℹ️ Cloudflare integration not configured');
    logger.info(`   Current Replit URL: ${replitUrl}`);
    logger.info(`   Configure CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and CLOUDFLARE_WORKER_NAME for Worker integration`);
    return;
  }
  
  logger.info('🌐 Configuring Cloudflare Worker access...');
  logger.info(`   Current Replit URL: ${replitUrl}`);
  
  // 自动获取并显示 Worker URL
  const subdomain = await getWorkersSubdomain(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN);
  if (subdomain) {
    const workerUrl = `https://${CLOUDFLARE_WORKER_NAME}.${subdomain}.workers.dev`;
    logger.success('✅ Worker URL detected!');
    logger.info(`   🌐 Worker URL: ${workerUrl}`);
    logger.info(`   📊 API Endpoint: ${workerUrl}/api/vrchat/sponsors/YOUR_GUILD_ID`);
    logger.info(`   ❤️ Health Check: ${workerUrl}/health`);
  }
  
  logger.info(`💡 Worker will automatically fetch latest URL from: ${replitUrl}/__replit_url`);
  logger.info('   ℹ️ This is the recommended approach for GitHub-deployed Workers');
}
