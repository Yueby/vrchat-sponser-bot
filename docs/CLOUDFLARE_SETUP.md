# Cloudflare 自动代理配置指南

本指南将帮你配置 Cloudflare Workers，实现**永久固定域名** + **完全自动的 URL 更新**。

## 🎯 最终效果

- ✅ 获得固定的访问域名：`https://your-worker.your-account.workers.dev`
- ✅ **完全自动更新**：Replit 每次启动自动更新 Cloudflare
- ✅ 双重保障：自动更新失败时，Worker 还能主动查询
- ✅ 完全免费（Cloudflare Workers 免费版：每天 10 万次请求）

## 📋 配置步骤

### 步骤 1：创建 Cloudflare Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages**
3. 点击 **Create Application** → **Create Worker**
4. 给 Worker 命名（如：`vrchat-bot-proxy`）
5. 将 `cloudflare-worker.js` 文件的内容复制粘贴到编辑器中
6. 点击 **Deploy**

### 步骤 2：获取 Cloudflare API Token

1. 访问：https://dash.cloudflare.com/profile/api-tokens
2. 点击 **Create Token**
3. 使用 **Edit Cloudflare Workers** 模板
4. 配置权限：
   - **Account** → Workers Scripts → **Edit**
5. 点击 **Continue to summary** → **Create Token**
6. **复制并保存**生成的 Token（只显示一次！）

### 步骤 3：获取 Account ID

1. 在 Cloudflare Dashboard 任意页面右侧找到 **Account ID**
2. 或访问 Worker 页面，URL 中包含 Account ID
3. 复制这个 ID（类似 `52181459d0b5379eab8c11a3cd8b0b84`）

### 步骤 4：获取 Workers.dev 子域名

1. 在 Cloudflare Worker 页面，查看 **域和路由** 标签页
2. 找到 `workers.dev` 类型的路由
3. URL 格式为：`{worker-name}.{subdomain}.workers.dev`
4. 复制中间的 `subdomain` 部分（如截图中的 `yueby-sp`）

### 步骤 5：在 Replit 配置环境变量

在 Replit 的 **Secrets** 工具（左侧工具栏锁图标）中添加：

```bash
CLOUDFLARE_API_TOKEN=你的API_Token
CLOUDFLARE_ACCOUNT_ID=你的Account_ID  
CLOUDFLARE_WORKER_NAME=vrchat-bot-proxy
CLOUDFLARE_WORKER_SUBDOMAIN=你的subdomain（如 yueby-sp）
```

**重要提示：**
- 使用 Replit **Secrets** 工具，不要写在代码里
- `CLOUDFLARE_WORKER_NAME` 是你在步骤1创建的 Worker 名称
- `CLOUDFLARE_WORKER_SUBDOMAIN` 是你的 workers.dev 子域名（在 Worker 路由中查看）
- **不要**把 Token 提交到 Git 仓库！

### 步骤 6：测试自动更新

1. 在 Replit 上**重启你的 Bot**（点击 Stop 然后 Run）

2. 查看启动日志，应该看到：
   ```
   [INFO] 🌐 Replit URL (Run mode - temporary): https://xxxxx.proxy.replit.dev
   [INFO] 🌐 Updating Cloudflare Worker environment variable...
   [INFO]    Current Replit URL: https://xxxxx.proxy.replit.dev
   [INFO] ✅ Cloudflare Worker updated successfully!
   [INFO]    Worker URL: https://vrchat-bot-proxy.your-subdomain.workers.dev
   [INFO] ✨ Access your bot via Cloudflare (permanent URL):
   [INFO]    🌐 Worker URL: https://vrchat-bot-proxy.your-subdomain.workers.dev
   [INFO]    📊 API Endpoint: https://vrchat-bot-proxy.your-subdomain.workers.dev/api/vrchat/sponsors/YOUR_GUILD_ID
   [INFO]    ❤️ Health Check: https://vrchat-bot-proxy.your-subdomain.workers.dev/health
   ```

3. 访问你的 Worker URL 测试健康检查：
   ```
   https://your-worker.your-account.workers.dev/health
   ```

4. 你应该看到类似的响应：
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

5. 测试 API 端点：
   ```
   https://your-worker.your-account.workers.dev/api/vrchat/sponsors/YOUR_GUILD_ID
   ```

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
    ↓ (使用最新URL)
Replit Backend (临时 URL)
    ↓ (启动时自动更新Worker)
MongoDB + Discord API
```

### 自动更新机制：

1. **配置 API Token**：在 Replit Secrets 中配置 Cloudflare 凭证
2. **Replit 启动**：Bot 检测当前 URL
3. **自动调用 API**：Bot 调用 Cloudflare API，更新 Worker 的 `REPLIT_URL` 环境变量
4. **Worker 更新**：Cloudflare 立即生效，所有请求转发到新 URL
5. **双重保障**：如果 API 更新失败，Worker 还能通过 `/__replit_url` 端点主动查询

### 优势：

- ✅ **完全自动**：每次启动自动更新，无需人工干预
- ✅ **即时生效**：API 更新后立即生效
- ✅ **双重保障**：API + 查询端点双重机制
- ✅ **零维护**：配置一次，永久自动

## ❓ 常见问题

### Q: API Token 安全吗？

A: 使用 Replit Secrets 存储是安全的。Token 权限仅限于编辑 Workers，且不会提交到 Git。

### Q: Worker 免费版有什么限制？

A: 每天 10 万次请求，对于小型 bot 完全够用。超出后降级为 429 错误。

### Q: 可以绑定自定义域名吗？

A: 可以！在 Worker Settings → Triggers → Custom Domains 添加。

### Q: Replit URL 变化后多久会更新？

A: Bot 启动时立即调用 API 更新，秒级生效。如果 API 失败，Worker 会每分钟通过 `/__replit_url` 端点查询。

### Q: 如果不配置 Cloudflare 会怎样？

A: Bot 仍然正常运行，只是使用 Replit 的临时 URL。日志会提示 "Cloudflare auto-update not configured"。

### Q: API 更新失败怎么办？

A: Bot 会在日志中显示错误，但不会影响运行。Worker 会使用备用机制（查询端点）继续工作。

### Q: 如何验证 API 更新成功？

A: 查看 Bot 启动日志中的 "✅ Cloudflare Worker updated successfully!" 消息。也可以在 Cloudflare Dashboard → Worker → Settings → Variables 中查看 `REPLIT_URL` 变量。

## 🎉 完成！

现在你拥有了一个：
- ✅ 完全免费的解决方案
- ✅ 固定的访问域名
- ✅ 全自动的 URL 更新
- ✅ 全球 CDN 加速

享受你的 Discord Bot 吧！🚀
