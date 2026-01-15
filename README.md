# VRChat Sponsor Bot

基于 Discord.js 和 MongoDB 的多服务器赞助者管理系统，专为 VRChat 世界设计。

## ✨ 核心特性

### 多服务器支持
- 🏢 **完全隔离**：每个 Discord 服务器独立数据
- 🚀 **快速启动**：Bot 启动仅同步服务器信息，成员按需加载
- 🔄 **实时更新**：成员加入/离开自动更新数据库
- 📊 **性能优化**：批量数据库操作和智能缓存管理

### 数据管理
- 💾 **最小化存储**：仅存储核心数据（roles ID, isBooster 等）
- 🔍 **实时获取**：所有展示数据（用户名、头像、角色名）动态查询
- ✅ **输入验证**：VRChat 名称格式和长度验证
- 🔒 **类型安全**：完整 TypeScript 类型定义
- 📜 **历史追踪**：自动记录 VRChat 名称变更历史

### API 功能
- 🌐 **RESTful API**：按服务器获取赞助者列表
- 🎭 **角色分组**：自动按 Discord 角色分组返回
- 🔐 **访问控制**：服务器所有者可启用/禁用 API
- ⚡ **限流保护**：180 次/分钟

### 外部用户支持
- 👥 **中国用户友好**：支持无法加入 Discord 服务器的用户
- 🎭 **虚拟角色**：使用服务器现有角色名称
- 📝 **管理员管理**：由管理员手动添加和维护
- 🔗 **可选关联**：可关联 Discord 账号（如有）

### 管理工具
- 🔍 **强大搜索**：按 VRChat 名称、Discord ID 或角色搜索用户
- 📊 **详细统计**：查看服务器绑定率、成员排名等数据
- 🔧 **内存管理**：实时监控和手动清理缓存
- 📜 **历史查询**：查看用户的名称变更历史

### 内存优化
- 🚀 **智能缓存**：限制缓存大小，自动清理策略
- 📊 **实时监控**：每 15 分钟自动记录内存使用情况
- ⚡ **按需加载**：成员数据按需获取，避免启动时批量加载
- 🗂️ **索引优化**：优化数据库查询和排序性能

---

## 🎮 命令列表

### 用户命令
- `/changename <name>` - 绑定或更新 VRChat 名字
- `/whoami` - 查看自己的绑定状态和详细信息（包含统计数据）
- `/history` - 查看 VRChat 名称变更历史记录

### 服务器管理命令（管理员/所有者）
- `/server stats` - 查看服务器统计信息和 API 状态
- `/server api <enabled>` - 启用/禁用 API 访问（仅所有者）

### 管理员命令
- `/admin sync` - 手动同步所有成员数据
- `/admin unbind <user>` - 强制解绑指定用户
- `/admin memory [action]` - 查看或管理 Bot 内存使用情况
- `/admin search <type> <value>` - 搜索用户（按 VRChat 名称、Discord ID 或角色）

### 外部用户管理命令（管理员专用）
- `/external add` - 添加无法加入服务器的外部用户
- `/external update` - 更新外部用户信息
- `/external remove` - 删除外部用户
- `/external list` - 列出所有外部用户

---

## 🌐 API 端点

### 健康检查端点

#### `GET /ping`
快速健康检查，返回 `pong`（用于 UptimeRobot 等监控服务）

#### `GET /health`
详细健康状态检查，返回：
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": 1234567890,
  "services": {
    "database": "connected",
    "discord": "online",
    "guilds": 5
  }
}
```
- **200**: 所有服务正常
- **503**: 服务降级（数据库或 Discord 离线）

### `GET /api/vrchat/sponsors/:guildId`

返回指定服务器的赞助者列表（VRChat DataDictionary 格式）

**响应示例**：
```json
{
  "VIP": {
    "0": {
      "vrchatName": "VRChatUser1",
      "displayName": "DiscordNick1",
      "avatar": "https://cdn.discordapp.com/avatars/...",
      "isBooster": true,
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "supportDays": 365
    }
  },
  "Member": {
    "0": { ... }
  },
  "allRoles": ["VIP", "Member"]
}
```

**特点**：
- 仅返回有角色的用户
- 按角色分组
- 用户可以出现在多个角色组中
- 自动计算支持天数
- 包含服务器成员和外部用户
- `isExternal` 字段区分用户类型

**使用示例**：
```bash
# 获取服务器赞助者列表
curl https://your-bot-domain.com/api/vrchat/sponsors/YOUR_GUILD_ID

# 在 VRChat World 中使用 (Udon#)
string url = "https://your-bot-domain.com/api/vrchat/sponsors/YOUR_GUILD_ID";
VRCUrl vrcUrl = new VRCUrl(url);
```

**错误响应**：
- `404` - 服务器未找到
- `403` - API 访问已禁用
- `500` - 内部错误

**速率限制**：
- 180 次/分钟
- 超出限制返回 `429 Too Many Requests`

---

## 🚀 快速开始

### 1. 创建 Discord Bot

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 创建新应用程序，记录 `Application ID`（即 `CLIENT_ID`）
3. 在 **Bot** 页面创建 Bot，记录 `Bot Token`（即 `DISCORD_TOKEN`）
4. **启用必需的 Intents**：
   - ✅ `PRESENCE INTENT`
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `MESSAGE CONTENT INTENT`
5. **设置 Bot 权限**：
   - 在 OAuth2 → URL Generator 中选择：
     - Scopes: `bot`, `applications.commands`
     - Bot Permissions: `Manage Roles`, `Read Messages/View Channels`, `Send Messages`
6. 使用生成的链接邀请 Bot 到服务器

### 2. 环境要求
- Node.js 18+ 
- MongoDB Atlas 账户（或本地 MongoDB）
- Discord Bot Token 和 Application ID

### 3. 安装依赖
```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 4. 配置环境变量
复制 `.env.example` 为 `.env` 并填写：
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
PORT=3000
```

### 5. 编译 TypeScript
```bash
pnpm run build
```

### 6. 注册命令
```bash
pnpm run register
```

### 7. 启动 Bot
```bash
# 生产环境
pnpm start

# 开发环境（自动重载）
pnpm run dev
```

---

## 📦 部署指南

### Replit 部署

1. **Fork 项目到 Replit**
2. **配置 Secrets（环境变量）**
   - 在 Replit 的 Secrets 面板中添加必需的环境变量
   - 至少需要：`DISCORD_TOKEN`、`CLIENT_ID`、`MONGO_URI`
3. **运行项目**
   - Replit 会自动安装依赖并启动
   - 使用 `.replit` 配置文件中的命令
4. **保活设置**
   - Replit 免费版会在无活动时休眠
   - 推荐使用 [UptimeRobot](https://uptimerobot.com/) 监控 `/ping` 端点
   - 设置每 5 分钟 ping 一次 `https://your-repl.replit.app/ping`

### 其他平台

本 Bot 支持任何提供 Node.js 18+ 和持久连接的平台：
- Railway
- Render
- Fly.io
- VPS（Linux）
- Docker（使用 `node:18-alpine` 镜像）

**注意**：Cloudflare Workers 等 Serverless 平台不支持 Discord Gateway API，需要重构为 Interactions Endpoint 模式。

---

## 🔧 环境变量说明

| 变量 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `DISCORD_TOKEN` | ✅ | Discord Bot Token | - |
| `CLIENT_ID` | ✅ | Discord Application ID | - |
| `MONGO_URI` | ✅ | MongoDB 连接字符串 | - |
| `PORT` | ❌ | HTTP 服务器端口 | 3000 |
| `SERVER_PORT` | ❌ | 备用端口（Replit/Pterodactyl） | - |
| `NODE_ENV` | ❌ | 运行环境（development/production） | production |
| `LOG_LEVEL` | ❌ | 日志级别（DEBUG/INFO/WARN/ERROR） | INFO |
| `LOG_TIMESTAMP` | ❌ | 显示日志时间戳（true/false） | true |
| `MEMORY_CHECK_MINUTES` | ❌ | 内存检查间隔（分钟） | 15 |
| `ENABLE_STARTUP_REPORT` | ❌ | 启动时显示内存报告（true/false） | false |

---

## 🐛 常见问题

**Q: Bot 无法同步成员？**  
A: 确保 Bot 拥有 `GuildMembers` Intent（在 Discord Developer Portal 启用）

**Q: API 返回 403？**  
A: 使用 `/server api true` 命令启用 API 访问

**Q: 用户重新加入服务器后数据丢失？**  
A: 数据在用户离开时自动删除，重新加入需要重新绑定

**Q: 如何添加无法加入服务器的用户？**  
A: 使用 `/external add` 命令添加外部用户，他们会出现在 API 返回中

**Q: 外部用户和服务器成员有什么区别？**  
A: 外部用户使用虚拟角色，不能是 Booster，API 返回中 `isExternal` 为 `true`

**Q: 编译失败？**  
A: 确保 TypeScript 版本 >= 5.0，运行 `pnpm install` 重新安装依赖

**Q: 如何监控 Bot 的内存使用？**  
A: 使用 `/admin memory status` 查看内存状态，Bot 会每 15 分钟自动记录内存日志。如果内存过高，可以使用 `/admin memory clear` 手动清理缓存。可通过 `MEMORY_CHECK_MINUTES` 环境变量调整检查间隔

**Q: Bot 内存占用多少？**  
A: Bot 使用智能缓存管理和按需加载策略，内存占用取决于服务器数量和成员规模。建议在 256 MB 以上的容器中运行

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📮 联系方式

如有问题，请在 GitHub 上提交 Issue。
