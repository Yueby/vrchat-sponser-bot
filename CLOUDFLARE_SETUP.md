# Cloudflare 自动代理配置指南

本指南将帮你配置 Cloudflare Workers，实现**永久固定域名**，即使 Replit URL 变化也能自动更新。

## 🎯 最终效果

- ✅ 获得固定的访问域名：`https://your-worker.your-account.workers.dev`
- ✅ Replit 每次启动自动更新 Cloudflare 配置
- ✅ 无需手动操作，完全自动化
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
   - **Zone** → Workers Routes → **Edit**（如果需要绑定域名）
5. 点击 **Continue to summary** → **Create Token**
6. **复制并保存**生成的 Token（只显示一次）

### 步骤 3：获取 Account ID

1. 在 Cloudflare Dashboard 右侧找到 **Account ID**
2. 或访问：https://dash.cloudflare.com/ → 点击任意网站 → 右侧看到 **Account ID**
3. 复制这个 ID

### 步骤 4：在 Replit 配置环境变量

在 Replit 的 **Secrets** (或 `.env` 文件) 中添加：

```bash
# Cloudflare 自动更新配置
CLOUDFLARE_API_TOKEN=你的API_Token
CLOUDFLARE_ACCOUNT_ID=你的Account_ID
CLOUDFLARE_WORKER_NAME=vrchat-bot-proxy
```

**重要提示：**
- 在 Replit 上使用 **Secrets** 工具添加（左侧工具栏锁图标）
- **不要**把 Token 提交到 Git 仓库！

### 步骤 5：测试自动更新

1. 重启 Replit 项目（点击 Run）
2. 查看启动日志，应该看到：

```
[INFO] 🌐 Replit URL (Run mode - temporary): https://xxxxx-3000.proxy.replit.dev
[INFO] 🌐 Updating Cloudflare Worker with new URL...
[INFO]    Current Replit URL: https://xxxxx-3000.proxy.replit.dev
[INFO] ✅ Cloudflare Worker updated successfully!
[INFO] ✨ Access your bot via Cloudflare (permanent URL):
[INFO]    🌐 Worker URL: https://vrchat-bot-proxy.xxxxx.workers.dev
[INFO]    📊 API Endpoint: https://vrchat-bot-proxy.xxxxx.workers.dev/api/vrchat/sponsors/YOUR_GUILD_ID
[INFO]    ❤️ Health Check: https://vrchat-bot-proxy.xxxxx.workers.dev/health
```

3. 访问你的 Worker URL 测试健康检查：
   ```
   https://your-worker.your-account.workers.dev/health
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
    ↓
Replit Backend (临时 URL，自动更新)
    ↓
MongoDB + Discord API
```

1. **Replit 启动**时自动获取临时 URL
2. **自动调用** Cloudflare API 更新 Worker 环境变量
3. **Cloudflare Worker** 将所有请求转发到最新的 Replit URL
4. **外部访问**使用固定的 Worker URL，无需关心 Replit URL 变化

## ❓ 常见问题

### Q: 如果 Cloudflare API Token 泄露怎么办？

A: 立即在 Cloudflare Dashboard 删除旧 Token，创建新的。

### Q: Worker 免费版有什么限制？

A: 每天 10 万次请求，对于小型 bot 完全够用。超出后降级为 429 错误。

### Q: 可以绑定自定义域名吗？

A: 可以！在 Worker Settings → Triggers → Custom Domains 添加。

### Q: Replit URL 变化多久会更新？

A: 每次启动立即更新，约 2-5 秒完成。

### Q: 如果不配置 Cloudflare 会怎样？

A: Bot 仍然正常运行，只是使用 Replit 的临时 URL，需要手动管理 URL 变化。

## 🎉 完成！

现在你拥有了一个：
- ✅ 完全免费的解决方案
- ✅ 固定的访问域名
- ✅ 全自动的 URL 更新
- ✅ 全球 CDN 加速

享受你的 Discord Bot 吧！🚀
