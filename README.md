# VRChat Sponsor Bot

基于 Discord.js 和 MongoDB 的多服务器赞助者管理系统，专为 VRChat 世界设计。

## ✨ 核心特性

- 🏢 **多服务器支持**：每个 Discord 服务器独立数据，完全隔离
- 🎯 **基于角色管理**：服主配置要管理的角色，Bot 只追踪这些角色的成员
- 🚀 **智能缓存**：按需加载成员数据并提供 **1 分钟 API 响应缓存**，极大提升访问速度
- 🌐 **RESTful API**：按服务器获取赞助者列表（VRChat DataDictionary 格式）
- 📊 **Web Dashboard**：基于 Web Components 的精美深色系统计面板
- 👥 **外部用户支持**：为无法加入 Discord 服务器的用户提供虚拟绑定
- 📜 **历史追踪**：自动记录 VRChat 名称变更历史
- 🔔 **通知系统**：实时通知管理员用户绑定情况
- 🔐 **访问控制**：服务器所有者可启用/禁用 API
- ⚡ **限流保护**：180 次/分钟

---

## 🎮 命令列表

### 用户命令
- `/changename <name>` - 绑定或更新 VRChat 名字（需要拥有配置的角色）
- `/whoami` - 查看自己的绑定状态和详细信息
- `/history` - 查看 VRChat 名称变更历史记录

### 服务器配置命令（所有者）
- `/server roles add <role>` - 添加要管理的角色
- `/server roles remove <role>` - 移除管理的角色
- `/server roles list` - 查看当前管理的角色列表
- `/server roles clear` - 清除所有角色配置
- `/server notify <user>` - 设置接收 changename 通知的用户
- `/server stats` - 查看服务器统计信息、角色配置和绑定进度
- `/server api <enabled>` - 启用/禁用 API 访问

### 管理员命令
- `/admin unbound` - 查看未绑定 VRChat 名字的成员列表
- `/admin sync` - 手动同步指定角色成员数据
- `/admin unbind <user>` - 强制解绑指定用户
- `/admin memory [action]` - 查看或管理 Bot 内存使用情况
- `/admin search <type> <value>` - 搜索用户
- `/admin refresh` - 立即清除当前服务器的 API 缓存

### 外部用户管理（管理员）
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
- **响应缓存**：1 分钟（可通过 `/admin refresh` 手动刷新）
- 速率限制：180 次/分钟

### `GET /dashboard/:guildId` (NEW)
**Web 可视化面板**，采用 Web Components 构建的响应式深色界面。
- **功能**：展示服务器总赞助人数、角色分布及详细成员卡片。
- **访问**：直接在浏览器输入该 URL 即可查看，无需登录。

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

### 4. 首次配置

Bot 启动后，服务器所有者需要配置要管理的角色：

```
/server roles add @VIP
/server roles add @赞助者
```

Bot 会立即同步这些角色的成员数据。

**可选配置**：

```
# 设置通知接收者
/server notify @管理员

# 查看当前配置
/server stats
```

**重要**：只有拥有配置角色的成员才能使用 `/changename` 命令绑定 VRChat 名字。

---

## 📦 部署

### 支持的平台（100% 确认无需绑卡 💳）

本项目支持以下**验证过无需绑卡的免费平台**，自动检测平台 URL：

| 平台 | CPU | 内存 | 特点 | 推荐度 | 说明 |
|------|-----|------|------|--------|------|
| **Koyeb** | 0.1 vCPU | 512 MB | 1小时无流量自动休眠 | ⭐⭐⭐⭐⭐ | 最简单、固定域名 |
| **Railway** | 1 vCPU | 512 MB | $5/月（约500小时） | ⭐⭐⭐⭐⭐ | 简单易用、额度充足 |
| **Zeabur** | 1 vCPU | 2 GB | $5/月（按量计费） | ⭐⭐⭐⭐⭐ | 中国友好、配置最高 |
| **Render** | 0.1 vCPU | 512 MB | 15分钟无活动休眠 | ⭐⭐⭐⭐ | 需保活（UptimeRobot） |
| **Fly.io** | 1 vCPU | 256 MB | 3个实例 + 160GB流量 | ⭐⭐⭐⭐ | 配置稍复杂但强大 |

> 💡 **数据来源**：基于 2026 年 1 月 15 日的官方文档验证，100% 确认无需绑卡

### 快速部署步骤

1. **选择平台**并创建应用
2. **连接 GitHub** 仓库
3. **添加环境变量**：
   ```env
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_application_id
   MONGO_URI=mongodb+srv://...
   ```
4. **部署**！Bot 会自动检测平台 URL

### Cloudflare Worker 反向代理（推荐）

使用 Cloudflare Worker 作为反向代理，获得：
- 🌐 **固定域名**：无论后端如何变化
- 🇨🇳 **国内加速**：Cloudflare CDN 加速访问
- 🔒 **额外保护**：DDoS 防护和限流
- 🆓 **完全免费**：每天 100,000 次请求

**自动同步后端 URL：**
Bot 启动时会自动检测平台并更新 Worker 的 `BACKEND_URL`。

详见 [vrchat-bot-worker/README.md](vrchat-bot-worker/README.md)

---

## 🔧 环境变量

### 基础配置（必需）

| 变量 | 必需 | 说明 |
|------|------|------|
| `DISCORD_TOKEN` | ✅ | Discord Bot Token |
| `CLIENT_ID` | ✅ | Discord Application ID |
| `MONGO_URI` | ✅ | MongoDB 连接字符串 |
| `PORT` | ❌ | HTTP 服务器端口（默认 3000） |

### Cloudflare Worker 集成（可选）

启用后，Bot 会自动同步后端 URL 到 Worker：

| 变量 | 说明 |
|------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_WORKER_NAME` | Worker 名称 |
| `BACKEND_URL` | 手动指定后端 URL（可选，通常自动检测） |

**自动平台检测：** Bot 会自动识别以下平台的官方环境变量

| 平台 | 环境变量 | 域名格式 |
|------|---------|---------|
| Koyeb | `KOYEB_PUBLIC_DOMAIN` | 自动提供完整域名 |
| Railway | `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL` | 完整 URL |
| Render | `RENDER_EXTERNAL_URL` / `RENDER_EXTERNAL_HOSTNAME` | 完整 URL 或主机名 |
| Zeabur | `ZEABUR_WEB_URL` / `ZEABUR_WEB_DOMAIN` | Git 部署服务 |
| Fly.io | `FLY_APP_NAME` | `${APP_NAME}.fly.dev` |

> 💡 **基于官方文档（2026年1月15日验证）**，100% 确认无需绑卡

### 其他配置（可选）

| 变量 | 说明 |
|------|------|
| `LOG_TIMESTAMP` | 显示日志时间戳（默认 true） |
| `NODE_ENV` | 运行环境（development/production） |

---

## 🔧 技术细节

### Discord Role 存储方式

- 使用 **role ID** 存储（非 role 名称）
- Role ID 是永久不变的 Snowflake ID
- 即使修改 role 名称，ID 不会改变，功能不受影响
- 显示时实时获取最新的 role 名称

### 角色管理机制

- **配置时同步**：添加角色后立即同步该角色的成员
- **实时监听**：成员获得/失去配置角色时自动同步
- **手动同步**：管理员可使用 `/admin sync` 命令强制同步
- **权限检查**：`/changename` 命令会检查用户是否拥有配置的角色

### 缓存管理机制
- **数据缓存**：API 响应默认开启 1 分钟内存缓存，保护服务器免受轮询压力。
- **手动刷新**：管理员可执行 `/admin refresh` 强行失效当前服务器缓存。
- **数据库索引**：针对 `vrchatName` 和 `guildId` 进行了索引优化，确保秒级查询。

### 绑定进度计算

- 总人数 = 拥有管理角色的成员数（排除 Bot）
- 已绑定 = 这些成员中已使用 `/changename` 的人数
- 进度 = 已绑定/总人数

### 权限控制

- **服务器所有者**：配置角色、通知、API 访问
- **管理员**：查看未绑定人员、手动同步、解绑用户
- **拥有配置角色的成员**：使用 `/changename` 绑定名字
- **其他成员**：无法使用 `/changename`

---

## 🐛 常见问题

**Q: Bot 无法同步成员？**  
A: 确保启用了 `SERVER MEMBERS INTENT`

**Q: 用户无法使用 /changename 命令？**  
A: 确保服主已使用 `/server roles add` 配置了管理角色，且用户拥有这些角色

**Q: API 返回 400 错误？**  
A: 服务器未配置管理角色。使用 `/server roles add` 添加要管理的角色

**Q: API 返回 403 错误？**  
A: 使用 `/server api true` 命令启用 API 访问

**Q: 如何添加无法加入服务器的用户？**  
A: 使用 `/external add` 命令添加外部用户

**Q: 如何监控 Bot 的内存使用？**  
A: 使用 `/admin memory status` 查看内存状态

**Q: 如何查看哪些成员未绑定？**  
A: 使用 `/admin unbound` 命令查看未绑定成员列表

**Q: 如何让 VRChat 世界立即可见最新的绑定修改？**  
A: 默认 API 有 1 分钟缓存。如果你需要立即生效，请管理员在 Discord 执行 `/admin refresh`。

---

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
