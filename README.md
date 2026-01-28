# VRChat Sponsor Bot

基于 Discord.js 和 MongoDB 的多服务器赞助者管理系统，专为 VRChat 世界设计。

## ✨ 核心特性

- 🛡️ **统合用户架构**：Discord 成员与外部赞助者（Manual）统合在单一模型下，标识一致
- 🏗️ **严格类型安全**：全项目 TypeScript 严格模式，零 `any`，健壮性极高
- 🚀 **Discord.js v14+**：利用最新 API (Select Menu in Modals, LabelBuilder) 提供原生级交互体验
- ⚡ **单消息 UI**：所有管理操作在同一条消息内原位更新，拒绝刷屏
- 🌐 **RESTful API**：按服务器获取赞助者列表（VRChat DataDictionary 格式）
- 📜 **历史追踪**：自动记录 VRChat 名称变更历史
- 🔔 **实时通知**：用户更新 VRChat 名字时自动通知管理员
- 🔐 **访问控制**：服务器所有者可启用/禁用 API
- 🛡️ **限流保护**：API 接口限流 180 次/分钟，保护服务器资源

---

## 🎮 命令列表

所有的管理功能都已集成到交互式面板中，无需记忆复杂的子命令。

### 1. 👤 个人用户指令 (`/me`)

- `/me` - **个人中心**：查看赞助名片、绑定 VRChat 账号、设置头像或查看改名历史。所有操作均在卡片上通过按钮完成。

### 2. 🛠️ 管理维护指令 (`/admin`)

- `/admin` - **管理员主面板**：
  - **Add Sponsor**: 弹出添加向导，支持选择 Discord 成员或手动输入。
  - **Search**: 搜索用户（支持 ID/名称）。
  - **Check Unbound**: 查看未绑定 VRChat 的赞助者。
  - **List All**: 查看完整赞助者列表。

### 3. ⚙️ 服务器配置指令 (`/server`)

- `/server` - **服务器设置面板**：
  - **Roles**: 管理 Bot 追踪的赞助者角色（添加/移除）。

## 🎮 指令列表

### 用户指令 (User)

- `/me`:
  - **查看个人档案**: 显示你的 VRChat 绑定信息、赞助状态、服务器排名。
  - **绑定/更新**: 绑定 VRChat 账号，或更新绑定的用户名。
  - **VRChat 曾用名**: 查看账号绑定的历史 VRChat 用户名记录。

### 管理员指令 (Admin)

- `/admin panel`:
  - 打开**管理员面板**，提供可视化按钮操作。
  - **Search**: 搜索用户（支持 Discord ID、Discord 昵称、VRChat 名字）。
  - **Add Discord User**: 启动向导，添加 Discord 用户为赞助者（选择用户 -> 输入 VRChat 名 -> 选择角色）。
  - **Add VRChat User**: 手动添加非 Discord 用户（仅输入 VRChat 名和角色）。
  - **List All**: 列出最近 30 位赞助者。
  - **Check Unbound**: 检查有赞助者角色但未绑定 VRChat 的成员。

### 服务器设置 (Server Owner)

- `/server settings`:
  - **Dashboard**: 查看服务器统计、同步状态、API 状态。
  - **Sync Now**: 手动触发一次 Discord 角色与数据库的同步。
  - **Manage Roles**: 设置哪些 Discord 角色被视为“赞助者”角色（Bot 会自动追踪这些角色）。
  - **Web API**: 开启/关闭 API 访问，查看 API Key（即 URL）。
  - **Notification**: 设置当有新绑定或同步变动时，通知哪个管理员。

---

## 🔌 API 接口 (For VRChat)

Bot 提供了一个极简的 JSON 接口，专为 VRChat Udon 设计。

**Endpoint:** `GET /api/vrchat/sponsors/:guildId`

**Response Example:**

````json
{
  "Sponsor": {
    "0": {
      "vrchatName": "VRCUser1",
      "avatar": "https://cdn.discordapp.com/avatars/...",
      "isBooster": false,
      "joinedAt": "2023-01-01T12:00:00.000Z",
      "supportDays": 365
- 按角色分组返回
- 自动计算支持天数
- 包含服务器成员和外部用户
- **响应缓存**：1 分钟（可通过 `/admin refresh` 手动刷新）
- 速率限制：180 次/分钟

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
````

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

| 平台        | CPU      | 内存   | 特点                | 推荐度     | 说明                  |
| ----------- | -------- | ------ | ------------------- | ---------- | --------------------- |
| **Koyeb**   | 0.1 vCPU | 512 MB | 1小时无流量自动休眠 | ⭐⭐⭐⭐⭐ | 最简单、固定域名      |
| **Railway** | 1 vCPU   | 512 MB | $5/月（约500小时）  | ⭐⭐⭐⭐⭐ | 简单易用、额度充足    |
| **Zeabur**  | 1 vCPU   | 2 GB   | $5/月（按量计费）   | ⭐⭐⭐⭐⭐ | 中国友好、配置最高    |
| **Render**  | 0.1 vCPU | 512 MB | 15分钟无活动休眠    | ⭐⭐⭐⭐   | 需保活（UptimeRobot） |
| **Fly.io**  | 1 vCPU   | 256 MB | 3个实例 + 160GB流量 | ⭐⭐⭐⭐   | 配置稍复杂但强大      |

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

| 变量            | 必需 | 说明                         |
| --------------- | ---- | ---------------------------- |
| `DISCORD_TOKEN` | ✅   | Discord Bot Token            |
| `CLIENT_ID`     | ✅   | Discord Application ID       |
| `MONGO_URI`     | ✅   | MongoDB 连接字符串           |
| `PORT`          | ❌   | HTTP 服务器端口（默认 3000） |

### Cloudflare Worker 集成（可选）

启用后，Bot 会自动同步后端 URL 到 Worker：

| 变量                     | 说明                                   |
| ------------------------ | -------------------------------------- |
| `CLOUDFLARE_API_TOKEN`   | Cloudflare API Token                   |
| `CLOUDFLARE_ACCOUNT_ID`  | Cloudflare Account ID                  |
| `CLOUDFLARE_WORKER_NAME` | Worker 名称                            |
| `BACKEND_URL`            | 手动指定后端 URL（可选，通常自动检测） |

**自动平台检测：** Bot 会自动识别以下平台的官方环境变量

| 平台    | 环境变量                                           | 域名格式              |
| ------- | -------------------------------------------------- | --------------------- |
| Koyeb   | `KOYEB_PUBLIC_DOMAIN`                              | 自动提供完整域名      |
| Railway | `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL`     | 完整 URL              |
| Render  | `RENDER_EXTERNAL_URL` / `RENDER_EXTERNAL_HOSTNAME` | 完整 URL 或主机名     |
| Zeabur  | `ZEABUR_WEB_URL` / `ZEABUR_WEB_DOMAIN`             | Git 部署服务          |
| Fly.io  | `FLY_APP_NAME`                                     | `${APP_NAME}.fly.dev` |

> 💡 **基于官方文档（2026年1月15日验证）**，100% 确认无需绑卡

### 其他配置（可选）

| 变量            | 说明                               |
| --------------- | ---------------------------------- |
| `LOG_TIMESTAMP` | 显示日志时间戳（默认 true）        |
| `NODE_ENV`      | 运行环境（development/production） |

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
