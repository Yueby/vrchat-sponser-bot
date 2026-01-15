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
    logger.info('🌐 Updating Cloudflare Worker environment variable...');
    logger.info(`   Current Replit URL: ${replitUrl}`);
    
    // 使用 Cloudflare Workers Script API 更新环境变量
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_WORKER_NAME}/settings`;
    
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bindings: [
          {
            type: 'plain_text',
            name: 'REPLIT_URL',
            text: replitUrl
          }
        ]
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
    
    logger.success('✅ Cloudflare Worker updated successfully!');
    
    // 自动获取并显示 Worker URL
    const subdomain = await getWorkersSubdomain(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN);
    if (subdomain) {
      const workerUrl = `https://${CLOUDFLARE_WORKER_NAME}.${subdomain}.workers.dev`;
      logger.info(`   🌐 Worker URL: ${workerUrl}`);
      logger.info(`   📊 API Endpoint: ${workerUrl}/api/vrchat/sponsors/YOUR_GUILD_ID`);
      logger.info(`   ❤️ Health Check: ${workerUrl}/health`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Failed to update Cloudflare Worker:', errorMessage);
    logger.warn('   Bot will continue running');
    logger.info(`   💡 You can manually set REPLIT_URL in Cloudflare Dashboard`);
  }
}
