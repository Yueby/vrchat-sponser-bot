import { logger } from './logger';

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
  
  // 检查是否配置了 Cloudflare
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKER_NAME) {
    logger.info('ℹ️ Cloudflare integration not configured');
    logger.info(`   Current Replit URL: ${replitUrl}`);
    logger.info(`   Configure CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and CLOUDFLARE_WORKER_NAME for automatic updates`);
    return;
  }
  
  try {
    logger.info(`Updating Cloudflare Worker: ${replitUrl}`);
    
    // 使用 Secrets API 更新 Worker secret
    const secretUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_WORKER_NAME}/secrets`;
    
    const response = await fetch(secretUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'REPLIT_URL',
        text: replitUrl,
        type: 'secret_text'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json() as any;
    
    if (!result.success) {
      throw new Error(`API error: ${JSON.stringify(result.errors)}`);
    }
    
    // 自动获取并显示 Worker URL
    const subdomain = await getWorkersSubdomain(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN);
    if (subdomain) {
      const workerUrl = `https://${CLOUDFLARE_WORKER_NAME}.${subdomain}.workers.dev`;
      logger.success(`Cloudflare Worker updated successfully!`);
      logger.info(`   Worker URL: ${workerUrl}`);
      logger.info(`   API Endpoint: ${workerUrl}/api/vrchat/sponsors/YOUR_GUILD_ID`);
      logger.info(`   Health Check: ${workerUrl}/health`);
    } else {
      logger.success(`Cloudflare Worker updated successfully!`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to update Cloudflare Worker: ${errorMessage}`);
    logger.warn('Bot will continue running. You can manually set REPLIT_URL in Cloudflare Dashboard');
  }
}
