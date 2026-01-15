/**
 * Cloudflare Worker - VRChat Bot 智能反向代理
 * 
 * 方案说明：
 * 1. Worker 首先尝试使用手动配置的 REPLIT_URL 环境变量
 * 2. 如果请求 /__replit_url，则从后端获取最新 URL 并缓存
 * 3. 其他请求自动转发到最新的 Replit URL
 */

// URL 缓存（在 Worker 实例中保持）
let cachedReplitUrl = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 分钟缓存

export default {
  async fetch(request, env, ctx) {
    // 配置的默认 URL（手动设置一次即可）
    const MANUAL_URL = env.REPLIT_URL || null;
    
    // 获取当前应该使用的 Replit URL
    async function getReplitUrl() {
      // 1. 如果有手动配置的 URL，优先使用
      if (MANUAL_URL && MANUAL_URL !== 'https://placeholder.proxy.replit.dev') {
        return MANUAL_URL;
      }
      
      // 2. 检查缓存是否有效
      const now = Date.now();
      if (cachedReplitUrl && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedReplitUrl;
      }
      
      // 3. 尝试从后端获取最新 URL
      // 这里需要一个初始 URL 来启动（第一次需要手动设置）
      if (!MANUAL_URL) {
        throw new Error('No REPLIT_URL configured and no cached URL available');
      }
      
      try {
        const response = await fetch(`${MANUAL_URL}/__replit_url`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          cachedReplitUrl = data.url;
          lastFetchTime = now;
          return cachedReplitUrl;
        }
      } catch (error) {
        // 如果获取失败，继续使用现有的 URL
        console.error('Failed to fetch latest URL:', error);
      }
      
      return MANUAL_URL;
    }
    
    // 构建目标 URL
    const url = new URL(request.url);
    
    // 处理 OPTIONS 预检请求（CORS）
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    // 获取当前的 Replit URL
    const REPLIT_URL = await getReplitUrl();
    const targetUrl = new URL(url.pathname + url.search, REPLIT_URL);
    
    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
    headers.set('X-Forwarded-Host', url.hostname);
    
    try {
      // 转发请求到 Replit
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'follow'
      });
      
      // 获取响应
      const response = await fetch(modifiedRequest);
      
      // 复制响应并添加 CORS 头
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      // 添加 CORS 头
      modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
      modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      
      // 添加自定义头，标识经过了 Cloudflare Worker
      modifiedResponse.headers.set('X-Proxied-By', 'Cloudflare-Worker');
      modifiedResponse.headers.set('X-Backend-URL', REPLIT_URL);
      
      return modifiedResponse;
      
    } catch (error) {
      // 错误处理
      return new Response(JSON.stringify({
        error: 'Proxy Error',
        message: error.message || 'Failed to connect to backend',
        timestamp: new Date().toISOString()
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
