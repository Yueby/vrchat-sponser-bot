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
  
  // 检查是否配置了 Cloudflare 自动更新
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKER_NAME) {
    logger.info('ℹ️ Cloudflare auto-update not configured');
    logger.info(`   Current Replit URL: ${replitUrl}`);
    logger.info(`   Worker can manually fetch from: ${replitUrl}/__replit_url`);
    return;
  }
  
  try {
    logger.info('🌐 Updating Cloudflare Worker environment variable...');
    logger.info(`   Current Replit URL: ${replitUrl}`);
    
    // 使用 Cloudflare Workers 环境变量 API
    // API 文档: https://developers.cloudflare.com/api/operations/worker-environment-variables-create-environment-variable
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_WORKER_NAME}/environments/production/variables`;
    
    // 先获取现有的环境变量
    const getResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    let existingVars: any[] = [];
    if (getResponse.ok) {
      const data = await getResponse.json() as any;
      existingVars = data.result || [];
    }
    
    // 过滤掉旧的 REPLIT_URL，保留其他变量
    const otherVars = existingVars.filter((v: any) => v.name !== 'REPLIT_URL');
    
    // 添加新的 REPLIT_URL
    const updatedVars = [
      ...otherVars,
      {
        name: 'REPLIT_URL',
        text: replitUrl,
        type: 'secret_text'
      }
    ];
    
    // 更新所有环境变量
    const putResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedVars)
    });
    
    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      throw new Error(`API error (${putResponse.status}): ${errorText}`);
    }
    
    const result = await putResponse.json() as any;
    
    if (!result.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(result.errors)}`);
    }
    
    logger.success('✅ Cloudflare Worker updated successfully!');
    logger.info(`   Worker URL: https://${CLOUDFLARE_WORKER_NAME}.${CLOUDFLARE_ACCOUNT_ID}.workers.dev`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Failed to update Cloudflare Worker:', errorMessage);
    logger.warn('   Bot will continue running, but Cloudflare proxy may have old URL');
    logger.info(`   💡 Worker can still fetch URL from: ${replitUrl}/__replit_url`);
  }
}
