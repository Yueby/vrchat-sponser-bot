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

### 内存优化
- 🚀 **智能缓存**：限制缓存大小，自动清理策略
- 📊 **实时监控**：每 5 分钟自动记录内存使用情况
- ⚡ **按需加载**：成员数据按需获取，避免启动时批量加载
- 🔧 **管理工具**：管理员可查看和手动清理缓存
- 💾 **低内存占用**：小型部署仅需 60-80 MB，适合受限环境

---

## 🎮 命令列表

### 用户命令
- `/changename <name>` - 绑定或更新 VRChat 名字
- `/whoami` - 查看自己的绑定状态和信息

### 服务器管理命令（管理员/所有者）
- `/server stats` - 查看服务器统计信息和 API 状态
- `/server api <enabled>` - 启用/禁用 API 访问（仅所有者）

### 管理员命令
- `/admin sync` - 手动同步所有成员数据
- `/admin unbind <user>` - 强制解绑指定用户
- `/admin memory [action]` - 查看或管理 Bot 内存使用情况

### 外部用户管理命令（管理员专用）
- `/external add` - 添加无法加入服务器的外部用户
- `/external update` - 更新外部用户信息
- `/external remove` - 删除外部用户
- `/external list` - 列出所有外部用户

---

## 🌐 API 端点

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

**错误响应**：
- `404` - 服务器未找到
- `403` - API 访问已禁用
- `500` - 内部错误

---

## 🚀 快速开始

### 1. 环境要求
- Node.js 18+ 
- MongoDB Atlas 账户（或本地 MongoDB）
- Discord Bot Token

### 2. 安装依赖
```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 3. 配置环境变量
复制 `.env.example` 为 `.env` 并填写：
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
PORT=3000
```

### 4. 编译 TypeScript
```bash
pnpm run build
```

### 5. 注册命令
```bash
pnpm run register
```

### 6. 启动 Bot
```bash
# 生产环境
pnpm start

# 开发环境（自动重载）
pnpm run dev
```

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 启动时间 | 2-5 秒 |
| API 响应时间 | <500ms |
| 内存占用（小型） | 60-80 MB |
| 内存占用（中型） | 80-120 MB |
| 内存占用（大型） | 100-150 MB |
| 缓存清理周期 | 15-30 分钟 |
| API 速率限制 | 180 次/分钟 |

---

## 🔧 环境变量说明

| 变量 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `DISCORD_TOKEN` | ✅ | Discord Bot Token | - |
| `CLIENT_ID` | ✅ | Discord Application ID | - |
| `MONGO_URI` | ✅ | MongoDB 连接字符串 | - |
| `PORT` | ❌ | HTTP 服务器端口 | 3000 |
| `SERVER_PORT` | ❌ | 备用端口（Pterodactyl） | - |
| `LOG_LEVEL` | ❌ | 日志级别 | INFO |

---

## 📝 开发说明

### 日志级别
设置 `LOG_LEVEL` 环境变量：
- `DEBUG` - 调试信息
- `INFO` - 一般信息（默认）
- `WARN` - 警告信息
- `ERROR` - 仅错误

### 代码质量
- ✅ 完整 TypeScript 类型
- ✅ ESLint 规则
- ✅ 统一日志系统
- ✅ 输入验证
- ✅ 错误处理

### 数据库索引
自动创建的索引：
- `Guild`: `guildId` (unique)
- `DiscordUser`: `(userId, guildId)` (unique composite)
- `VRChatBinding`: `(discordUserId, guildId)` (unique composite)
- `ExternalUser`: `(vrchatName, guildId)` (unique composite)
- `ExternalUser`: `(discordUserId, guildId)` (unique sparse)

---

## 🎯 设计理念

### 最小化存储
仅存储无法实时获取的核心数据：
- ✅ 存储：roles ID, isBooster, joinedAt
- ❌ 不存储：username, avatar, displayName, roleNames

### 实时数据
所有展示数据通过 Discord API 实时获取：
- 用户名、头像：`client.users.cache.get()`
- 角色名：`guild.roles.cache.get()`
- 显示名：`guild.members.cache.get()`

### 性能优化
- 智能缓存管理（限制大小，自动清理）
- 按需加载成员数据（避免启动时批量获取）
- 批量数据库操作（`bulkWrite`）
- 数据库查询字段过滤
- 内存监控和自动清理机制

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
A: 使用 `/admin memory status` 查看内存状态，Bot 会每 5 分钟自动记录内存日志。如果内存过高，可以使用 `/admin memory clear` 手动清理缓存

**Q: Bot 内存占用多少？**  
A: 经过优化后，小型部署（1-5 服务器）约 60-80 MB，中型部署（5-10 服务器）约 80-120 MB。适合在 256 MB 以上的容器中运行

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📮 联系方式

如有问题，请在 GitHub 上提交 Issue。
