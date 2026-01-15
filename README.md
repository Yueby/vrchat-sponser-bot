# VRChat Sponsor Bot

基于 Discord.js 和 MongoDB 的多服务器赞助者管理系统，专为 VRChat 世界设计。

## ✨ 核心特性

- 🏢 **多服务器支持**：每个 Discord 服务器独立数据，完全隔离
- 🚀 **智能缓存**：按需加载成员数据，优化内存占用
- 🌐 **RESTful API**：按服务器获取赞助者列表（VRChat DataDictionary 格式）
- 👥 **外部用户支持**：为无法加入 Discord 服务器的用户提供虚拟绑定
- 📜 **历史追踪**：自动记录 VRChat 名称变更历史
- 🔐 **访问控制**：服务器所有者可启用/禁用 API
- ⚡ **限流保护**：180 次/分钟

---

## 🎮 命令列表

### 用户命令
- `/changename <name>` - 绑定或更新 VRChat 名字
- `/whoami` - 查看自己的绑定状态和详细信息
- `/history` - 查看 VRChat 名称变更历史记录

### 管理员命令
- `/server stats` - 查看服务器统计信息和 API 状态
- `/server api <enabled>` - 启用/禁用 API 访问（仅所有者）
- `/admin sync` - 手动同步所有成员数据
- `/admin unbind <user>` - 强制解绑指定用户
- `/admin memory [action]` - 查看或管理 Bot 内存使用情况
- `/admin search <type> <value>` - 搜索用户

### 外部用户管理
- `/external add` - 添加外部用户
- `/external update` - 更新外部用户信息
- `/external remove` - 删除外部用户
- `/external list` - 列出所有外部用户

---

## 🌐 API 端点

### `GET /health`
健康状态检查

```json
{
  "status": "ok",
  "uptime": 12345,
  "services": {
    "database": "connected",
    "discord": "online",
    "guilds": 5
  }
}
```

### `GET /api/vrchat/sponsors/:guildId`
获取指定服务器的赞助者列表（VRChat DataDictionary 格式）

**响应示例**：
```json
{
  "VIP": {
    "0": {
      "vrchatName": "VRChatUser1",
      "displayName": "DiscordNick1",
      "avatar": "https://cdn.discordapp.com/...",
      "isBooster": true,
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "supportDays": 365
    }
  },
  "allRoles": ["VIP", "Member"]
}
```

**特点**：
- 按角色分组返回
- 自动计算支持天数
- 包含服务器成员和外部用户
- 速率限制：180 次/分钟

---

## 🚀 快速开始

### 1. 创建 Discord Bot

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 创建新应用程序，记录 `Application ID` 和 `Bot Token`
3. 启用必需的 Intents：
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `MESSAGE CONTENT INTENT`
4. 设置 Bot 权限：`Manage Roles`, `Read Messages`, `Send Messages`
5. 使用生成的链接邀请 Bot 到服务器

### 2. 配置环境

创建 `.env` 文件：

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
PORT=3000
```

### 3. 安装和运行

```bash
# 安装依赖
pnpm install

# 编译 TypeScript
pnpm run build

# 注册命令
pnpm run register

# 启动 Bot
pnpm start
```

---

## 📦 部署

### Replit 部署

1. Fork 项目到 Replit
2. 在 Secrets 面板添加环境变量（至少 `DISCORD_TOKEN`, `CLIENT_ID`, `MONGO_URI`）
3. 运行项目（Replit 会自动安装依赖）
4. **推荐**：使用 [UptimeRobot](https://uptimerobot.com/) 监控 `/ping` 端点保活

### Cloudflare Worker 代理（可选）

为 Replit 等临时 URL 提供固定域名访问，详见 [cloudflare-worker/README.md](cloudflare-worker/README.md)

---

## 🔧 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `DISCORD_TOKEN` | ✅ | Discord Bot Token |
| `CLIENT_ID` | ✅ | Discord Application ID |
| `MONGO_URI` | ✅ | MongoDB 连接字符串 |
| `PORT` | ❌ | HTTP 服务器端口（默认 3000） |
| `LOG_TIMESTAMP` | ❌ | 显示日志时间戳（默认 true） |

**Cloudflare 自动更新（可选）**：
| 变量 | 说明 |
|------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_WORKER_NAME` | Worker 名称 |

---

## 🐛 常见问题

**Q: Bot 无法同步成员？**  
A: 确保启用了 `SERVER MEMBERS INTENT`

**Q: API 返回 403？**  
A: 使用 `/server api true` 命令启用 API 访问

**Q: 如何添加无法加入服务器的用户？**  
A: 使用 `/external add` 命令添加外部用户

**Q: 如何监控 Bot 的内存使用？**  
A: 使用 `/admin memory status` 查看内存状态

---

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
