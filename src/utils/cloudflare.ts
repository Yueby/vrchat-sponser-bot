import { logger } from './logger';

/**
 * 自动更新 Cloudflare Worker 环境变量
 * 将当前 Replit URL 同步到 Cloudflare Workers
 */
export async function updateCloudflareWorker(): Promise<void> {
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CLOUDFLARE_WORKER_NAME = process.env.CLOUDFLARE_WORKER_NAME;
  
  // 检查是否配置了 Cloudflare 相关环境变量
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKER_NAME) {
    logger.debug('Cloudflare auto-update not configured, skipping...');
    return;
  }
  
  // 获取当前 Replit URL
  const replitUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : null;
    
  if (!replitUrl) {
    logger.warn('⚠️ Cannot detect Replit URL for Cloudflare update');
    return;
  }
  
  try {
    logger.info('🌐 Updating Cloudflare Worker with new URL...');
    logger.info(`   Current Replit URL: ${replitUrl}`);
    
    // 1. 获取现有的环境变量
    const getEnvUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_WORKER_NAME}/settings`;
    
    const getResponse = await fetch(getEnvUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get worker settings: ${getResponse.statusText}`);
    }
    
    const currentSettings = await getResponse.json() as any;
    
    // 2. 更新 REPLIT_URL 环境变量
    const existingBindings = currentSettings.result?.bindings || [];
    const otherBindings = existingBindings.filter((b: any) => 
      b.type !== 'plain_text' || b.name !== 'REPLIT_URL'
    );
    
    const newBindings = [
      ...otherBindings,
      {
        type: 'plain_text',
        name: 'REPLIT_URL',
        text: replitUrl
      }
    ];
    
    // 3. 提交更新
    const updateUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_WORKER_NAME}/settings`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bindings: newBindings
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update worker: ${updateResponse.statusText} - ${errorText}`);
    }
    
    logger.success('✅ Cloudflare Worker updated successfully!');
    logger.info(`   Worker URL: https://${CLOUDFLARE_WORKER_NAME}.${CLOUDFLARE_ACCOUNT_ID}.workers.dev`);
    
  } catch (error) {
    logger.error('❌ Failed to update Cloudflare Worker:', error);
    logger.warn('   Bot will continue running, but Cloudflare proxy may have old URL');
  }
}
