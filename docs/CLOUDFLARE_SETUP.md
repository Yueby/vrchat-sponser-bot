# Cloudflare 智能代理配置指南  

本指南将帮你配置 Cloudflare Workers，实现**永久固定域名** + **智能自动追踪**。

## 🎯 最终效果

- ✅ 获得固定的访问域名：`https://your-worker.your-account.workers.dev`
- ✅ **智能自动追踪**：Worker 自动从 Bot 获取最新 URL
- ✅ **极简配置**：只需 3 步，无需 API Token
- ✅ 完全免费（Cloudflare Workers 免费版：每天 10 万次请求）

## 📋 配置步骤（超简单！）

### 步骤 1：创建 Cloudflare Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages**
3. 点击 **Create Application** → **Create Worker**
4. 给 Worker 命名（如：`vrchat-bot-proxy`）
5. 将 `cloudflare-worker.js` 文件的内容复制粘贴到编辑器中
6. 点击 **Deploy**

### 步骤 2：配置初始 URL

1. 在 Replit 上运行你的 Bot
2. 从启动日志复制 Replit URL（类似 `https://xxxxx.proxy.replit.dev`）
3. 在 Cloudflare Worker 页面，进入 **Settings** → **Variables**
4. 点击 **Add variable**
5. 添加环境变量：
   - Name: `REPLIT_URL`
   - Value: 粘贴你复制的完整 URL
   - Type: **Text**（不要选 Secret）
6. 点击 **Deploy**

### 步骤 3：（可选）在 Replit 配置显示信息

在 Replit 的 **Secrets** 工具中添加（仅用于显示，不影响功能）：

```bash
CLOUDFLARE_WORKER_NAME=vrchat-bot-proxy
CLOUDFLARE_ACCOUNT_ID=你的Account_ID
```

这样启动时会显示完整的 Worker URL。

### 步骤 4：测试 Worker

1. 访问你的 Worker URL 测试健康检查：
   ```
   https://your-worker.your-account.workers.dev/health
   ```

2. 你应该看到类似的响应：
   ```json
   {
     "status": "ok",
     "uptime": 123,
     "timestamp": 1234567890,
     "services": {
       "database": "connected",
       "discord": "online",
       "guilds": 1
     }
   }
   ```

3. 测试 API 端点：
   ```
   https://your-worker.your-account.workers.dev/api/vrchat/sponsors/YOUR_GUILD_ID
   ```

4. **URL 自动更新测试**：
   - 在 Replit 重启 Bot（Replit URL 可能会变化）
   - 等待 1 分钟（Worker 缓存过期）
   - 再次访问 Worker URL，应该仍然正常工作
   - Worker 会自动从 `/__replit_url` 获取最新 URL

## 🚀 使用你的固定域名

### 配置 UptimeRobot 保活

使用 **Cloudflare Worker URL**（不是 Replit URL）：

```
Monitor Type: HTTP(s)
URL: https://your-worker.your-account.workers.dev/health
Interval: 5 minutes
```

### VRChat 世界中使用

在 Udon# 脚本中：

```csharp
string apiUrl = "https://your-worker.your-account.workers.dev/api/vrchat/sponsors/" + guildId;
```

### Discord Bot 命令

所有 Discord 命令正常使用，不受影响。

## 🔧 工作原理

```
VRChat 世界
    ↓
Cloudflare Worker (固定域名)
    ↓ (智能查询最新 URL)
Replit Backend (临时 URL)
    ↓ (提供查询端点)
MongoDB + Discord API
```

### 智能追踪机制：

1. **初始配置**：手动在 Worker 设置初始 `REPLIT_URL`（只需一次）
2. **Replit 启动**：Bot 将当前 URL 保存到内存
3. **Worker 请求**：
   - 首先使用配置的 `REPLIT_URL`
   - 每分钟通过 `/__replit_url` 端点获取最新 URL
   - 缓存最新 URL，减少查询次数
4. **URL 变化时**：Worker 自动检测并更新，无需人工干预

### 优势：

- ✅ **极简配置**：只需设置一次初始 URL，无需 API Token
- ✅ **智能缓存**：减少不必要的查询，提升性能
- ✅ **零维护**：URL 变化自动追踪
- ✅ **降级保护**：如果查询失败，继续使用缓存的 URL

## ❓ 常见问题

### Q: 为什么需要手动设置初始 URL？

A: Worker 需要一个起点来访问 Bot 的 `/__replit_url` 端点。设置一次后，Worker 就能自动追踪所有后续的 URL 变化。

### Q: Worker 免费版有什么限制？

A: 每天 10 万次请求，对于小型 bot 完全够用。超出后降级为 429 错误。

### Q: 可以绑定自定义域名吗？

A: 可以！在 Worker Settings → Triggers → Custom Domains 添加。

### Q: Replit URL 变化后多久会更新？

A: Worker 会在下次请求时自动获取最新 URL（缓存1分钟），基本上是实时的。

### Q: 如果不配置 Cloudflare 会怎样？

A: Bot 仍然正常运行，只是使用 Replit 的临时 URL，需要手动管理 URL 变化。

### Q: `/__replit_url` 端点安全吗？

A: 安全。这个端点只返回当前的 Replit URL，不包含任何敏感信息（Token、密码等），可以安全公开。

### Q: 如何验证 Worker 正在使用最新 URL？

A: 访问你的 Worker URL，检查响应头中的 `X-Backend-URL`，它会显示当前使用的 Replit URL。

## 🎉 完成！

现在你拥有了一个：
- ✅ 完全免费的解决方案
- ✅ 固定的访问域名
- ✅ 全自动的 URL 更新
- ✅ 全球 CDN 加速

享受你的 Discord Bot 吧！🚀
