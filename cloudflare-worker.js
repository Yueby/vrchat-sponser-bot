/**
 * Cloudflare Worker - VRChat Bot 反向代理
 * 
 * 自动将请求转发到 Replit 后端
 * REPLIT_URL 环境变量会在每次 bot 启动时自动更新
 */

export default {
  async fetch(request, env) {
    // Replit 后端 URL（自动从 bot 更新）
    const REPLIT_URL = env.REPLIT_URL || 'https://placeholder.proxy.replit.dev';
    
    // 构建目标 URL
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, REPLIT_URL);
    
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
