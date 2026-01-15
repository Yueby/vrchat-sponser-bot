/**
 * Cloudflare Worker - VRChat Bot 自动代理
 * 
 * 工作机制：
 * 1. Bot 启动时自动调用 Cloudflare API 更新 REPLIT_URL 环境变量
 * 2. Worker 读取最新的 REPLIT_URL 并转发所有请求
 * 3. 备用：如果环境变量未设置，尝试从 /__replit_url 端点获取
 */

// URL 缓存（用于备用查询机制）
let cachedReplitUrl = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 分钟缓存

export default {
  async fetch(request, env, ctx) {
    // 从环境变量获取 Replit URL（Bot 自动更新）
    let REPLIT_URL = env.REPLIT_URL || null;
    
    // 如果环境变量未设置，尝试从备用端点获取（双重保障）
    if (!REPLIT_URL || REPLIT_URL === 'https://placeholder.proxy.replit.dev') {
      const now = Date.now();
      
      // 检查缓存
      if (cachedReplitUrl && (now - lastFetchTime) < CACHE_DURATION) {
        REPLIT_URL = cachedReplitUrl;
      } else if (cachedReplitUrl) {
        // 尝试从备用端点获取最新 URL
        try {
          const response = await fetch(`${cachedReplitUrl}/__replit_url`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            cachedReplitUrl = data.url;
            lastFetchTime = now;
            REPLIT_URL = cachedReplitUrl;
          } else {
            REPLIT_URL = cachedReplitUrl; // 使用缓存
          }
        } catch (error) {
          console.error('Failed to fetch latest URL:', error);
          REPLIT_URL = cachedReplitUrl; // 使用缓存
        }
      } else {
        // 完全没有 URL 可用
        return new Response(JSON.stringify({
          error: 'Configuration Error',
          message: 'REPLIT_URL not configured. Please set the environment variable in Cloudflare Worker settings.',
          timestamp: new Date().toISOString()
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } else {
      // 如果有有效的环境变量，缓存它（用于备用）
      cachedReplitUrl = REPLIT_URL;
      lastFetchTime = Date.now();
    }
    
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
