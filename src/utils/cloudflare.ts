import { logger } from './logger';
import Guild from '../models/Guild';

interface CloudflareApiResponse {
  success: boolean;
  result: unknown;
  errors: unknown[];
}

interface CloudflareSubdomainResponse extends CloudflareApiResponse {
  result: {
    subdomain: string;
  };
}

/**
 * 自动检测当前部署平台的公网 URL
 * 基于各平台官方文档的环境变量（2026年1月15日验证）
 * 
 * 支持的平台（100% 确认无需绑卡）：
 * - Koyeb: KOYEB_PUBLIC_DOMAIN (免费、不休眠)
 * - Railway: RAILWAY_PUBLIC_DOMAIN, RAILWAY_STATIC_URL ($5/月免费额度)
 * - Render: RENDER_EXTERNAL_URL, RENDER_EXTERNAL_HOSTNAME (免费、需保活)
 * - Zeabur: ZEABUR_WEB_URL, ZEABUR_WEB_DOMAIN (按量付费、中国友好)
 * - Fly.io: FLY_APP_NAME (免费额度)
 * - 其他: BACKEND_URL (手动配置，最高优先级)
 */
function detectBackendUrl(): string | null {
  // 1. 手动配置的 BACKEND_URL（最高优先级）
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }

  // 2. Koyeb
  // 文档: https://www.koyeb.com/docs/build-and-deploy/environment-variables
  // KOYEB_PUBLIC_DOMAIN: 应用的公共域名（自动提供）
  if (process.env.KOYEB_PUBLIC_DOMAIN) {
    return `https://${process.env.KOYEB_PUBLIC_DOMAIN}`;
  }

  // 3. Railway
  // 文档: https://docs.railway.app/guides/public-networking
  // RAILWAY_PUBLIC_DOMAIN: 公共域名（推荐）
  // RAILWAY_STATIC_URL: 静态 URL（旧版，仍支持）
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL;
  }

  // 4. Render
  // 文档: https://render.com/docs/environment-variables
  // RENDER_EXTERNAL_URL: 完整的公共 URL（推荐）
  // RENDER_EXTERNAL_HOSTNAME: 仅主机名（需要添加 https://）
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
  }

  // 5. Zeabur
  // 文档: https://zeabur.com/docs/deploy/special-variables
  // ZEABUR_WEB_URL: 完整 URL（Git 部署服务使用 'web' 作为端口名）
  // ZEABUR_WEB_DOMAIN: 仅域名（需要添加 https://）
  if (process.env.ZEABUR_WEB_URL) {
    return process.env.ZEABUR_WEB_URL;
  }
  if (process.env.ZEABUR_WEB_DOMAIN) {
    return `https://${process.env.ZEABUR_WEB_DOMAIN}`;
  }

  // 6. Fly.io
  // 文档: https://fly.io/docs/reference/runtime-environment/
  // FLY_APP_NAME: 应用名称，域名格式为 ${APP_NAME}.fly.dev
  if (process.env.FLY_APP_NAME) {
    return `https://${process.env.FLY_APP_NAME}.fly.dev`;
  }

  // 7. Localhost (开发环境)
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || process.env.SERVER_PORT || 3000;
    return `http://localhost:${port}`;
  }

  return null;
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
    
    const data = await response.json() as CloudflareSubdomainResponse;
    return data.result?.subdomain || null;
  } catch (error) {
    return null;
  }
}

/**
 * 自动更新 Cloudflare Worker 环境变量
 * 自动检测 Koyeb, Railway, Render, Zeabur, Fly.io 等免费平台
 */
export async function updateCloudflareWorker(): Promise<void> {
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CLOUDFLARE_WORKER_NAME = process.env.CLOUDFLARE_WORKER_NAME;
  
  // 自动检测后端 URL
  const backendUrl = detectBackendUrl();
  
  if (!backendUrl) {
    logger.warn('Cannot detect backend URL from any platform');
    logger.info('   Supported platforms: Koyeb, Railway, Render, Zeabur, Fly.io');
    logger.info('   Or manually set BACKEND_URL environment variable');
    logger.info('   Example: BACKEND_URL=https://your-app.koyeb.app');
    return;
  }
  
  // 检测平台类型（用于日志显示）
  let platform = 'Unknown';
  if (process.env.BACKEND_URL) platform = 'Manual';
  else if (process.env.KOYEB_PUBLIC_DOMAIN) platform = 'Koyeb';
  else if (process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL) platform = 'Railway';
  else if (process.env.RENDER_EXTERNAL_URL || process.env.RENDER_EXTERNAL_HOSTNAME) platform = 'Render';
  else if (process.env.ZEABUR_WEB_URL || process.env.ZEABUR_WEB_DOMAIN) platform = 'Zeabur';
  else if (process.env.FLY_APP_NAME) platform = 'Fly.io';
  
  // 检查是否配置了 Cloudflare
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKER_NAME) {
    logger.info('');
    logger.info('[Cloudflare Worker]');
    logger.info('Not configured');
    logger.info(`   Platform: ${platform}`);
    logger.info(`   Backend URL: ${backendUrl}`);
    return;
  }
  
  try {
    logger.info('');
    logger.info('[Cloudflare Worker]');
    logger.info('Updating...');
    logger.info(`   Platform: ${platform}`);
    logger.info(`   Backend URL: ${backendUrl}`);
    
    // 使用 Secrets API 更新 Worker secret
    const secretUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_WORKER_NAME}/secrets`;
    
    const response = await fetch(secretUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'BACKEND_URL',
        text: backendUrl,
        type: 'secret_text'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json() as CloudflareApiResponse;
    
    if (!result.success) {
      throw new Error(`API error: ${JSON.stringify(result.errors)}`);
    }
    
    // 自动获取并显示 Worker URL
    const subdomain = await getWorkersSubdomain(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN);
    const domain = process.env.DOMAIN;
    
    // 确定最终显示的基准域名
    const baseWorkerUrl = domain 
      ? `https://${domain}` 
      : (subdomain ? `https://${CLOUDFLARE_WORKER_NAME}.${subdomain}.workers.dev` : null);

    if (baseWorkerUrl) {
      logger.success('Cloudflare Worker updated successfully!');
      logger.info(`   Worker URL: ${baseWorkerUrl}`);
      
      // 列出所有已配置的服务器 API 地址
      const activeGuilds = await Guild.find({ apiEnabled: true }, 'guildId').lean();
      if (activeGuilds.length > 0) {
        logger.info('   Active Server APIs:');
        activeGuilds.forEach(g => {
          logger.info(`     - ${g.guildId}: ${baseWorkerUrl}/api/vrchat/sponsors/${g.guildId}`);
        });
      } else {
        logger.info(`   API Template: ${baseWorkerUrl}/api/vrchat/sponsors/YOUR_GUILD_ID`);
      }
      
      logger.info(`   Health: ${baseWorkerUrl}/health`);
    } else {
      logger.success('Cloudflare Worker updated successfully!');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to update Cloudflare Worker: ${errorMessage}`);
    logger.warn('Bot will continue running. You can manually set BACKEND_URL in Cloudflare Dashboard');
  }
}
