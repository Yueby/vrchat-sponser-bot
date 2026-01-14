# 🚀 部署检查清单

## ✅ 部署前检查

### 1. 环境准备
- [ ] Node.js 18+ 已安装
- [ ] MongoDB Atlas 账户已创建（或本地 MongoDB 已运行）
- [ ] Discord Bot 已创建并获取 Token
- [ ] Bot 已邀请到测试服务器

### 2. Discord Bot 配置

#### 在 Discord Developer Portal 中：
- [ ] 已创建应用程序
- [ ] 已创建 Bot 用户
- [ ] 已复制 Bot Token
- [ ] 已复制 Application ID (CLIENT_ID)
- [ ] 已启用以下 Privileged Gateway Intents：
  - ✅ `SERVER MEMBERS INTENT` （必需）
  - ✅ `PRESENCE INTENT` （可选）
  - ✅ `MESSAGE CONTENT INTENT` （可选）

#### Bot 权限（邀请链接）
最小权限：
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025508352&scope=bot%20applications.commands
```

包含的权限：
- ✅ Read Messages/View Channels
- ✅ Send Messages
- ✅ Use Slash Commands
- ✅ Manage Roles（如需自动分配）

### 3. 代码检查
- [ ] 已运行 `pnpm install`
- [ ] 已运行 `pnpm run build` 无错误
- [ ] `dist/` 目录已生成
- [ ] 所有 TypeScript 文件已编译

### 4. 环境变量配置

创建 `.env` 文件：
```env
DISCORD_TOKEN=your_actual_bot_token_here
CLIENT_ID=your_actual_client_id_here
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
PORT=3000
LOG_LEVEL=INFO
```

检查：
- [ ] `DISCORD_TOKEN` 正确（以 `MTI...` 或类似开头）
- [ ] `CLIENT_ID` 正确（18-19 位数字）
- [ ] `MONGO_URI` 可连接（测试过）
- [ ] `PORT` 端口未被占用

### 5. 数据库准备
- [ ] MongoDB Atlas 集群已创建
- [ ] 数据库用户已创建（有读写权限）
- [ ] IP 白名单已配置（或设置为 `0.0.0.0/0` 允许所有）
- [ ] 连接字符串已测试

### 6. 注册命令
```bash
pnpm run register
```
- [ ] 命令注册成功（看到 `Successfully reloaded application (/) commands`）
- [ ] 在 Discord 服务器中输入 `/` 可以看到命令列表

---

## 🏃 启动 Bot

### 本地启动
```bash
# 生产模式
pnpm start

# 开发模式（自动重载）
pnpm run dev
```

### 检查启动日志
应该看到以下输出：
```
[INFO] Bot logged in as YourBot#1234
[INFO] Connected to 1 servers
[INFO] Syncing all guilds and members...
[INFO] Synced ServerName: 10 members
[INFO] Sync complete: 1 guilds, 10 members
[INFO] Connected to MongoDB Atlas
[INFO] Web server running on port 3000
```

---

## 🧪 功能测试

### 1. 基础功能测试
- [ ] Bot 在线（显示绿色状态）
- [ ] Bot 可以响应 `/` 命令

### 2. 命令测试

#### `/changename` 测试
```
/changename name:TestVRChatName
```
- [ ] 返回成功消息
- [ ] 显示当前角色
- [ ] 冷却时间正常工作（3 秒）

#### `/whoami` 测试
```
/whoami
```
- [ ] 显示个人信息
- [ ] 显示绑定状态
- [ ] 显示加入时间

#### `/server stats` 测试（需要管理员）
```
/server stats
```
- [ ] 显示成员数统计
- [ ] 显示绑定数统计
- [ ] 显示 API 状态
- [ ] 显示 API 端点

#### `/server api` 测试（需要所有者）
```
/server api enabled:true
/server api enabled:false
```
- [ ] 可以启用 API
- [ ] 可以禁用 API

#### `/admin sync` 测试（需要管理员）
```
/admin sync
```
- [ ] 成功同步成员
- [ ] 显示同步数量

#### `/admin unbind` 测试（需要管理员）
```
/admin unbind user:@SomeUser
```
- [ ] 可以解绑用户
- [ ] 显示解绑信息

### 3. API 测试

#### 获取赞助者列表
```bash
curl http://localhost:3000/api/vrchat/sponsors/YOUR_GUILD_ID
```

检查：
- [ ] 返回 JSON 格式数据
- [ ] 包含 `allRoles` 字段
- [ ] 用户按角色分组
- [ ] 包含所有必需字段（vrchatName, displayName, avatar 等）

#### 错误处理测试
```bash
# 不存在的服务器
curl http://localhost:3000/api/vrchat/sponsors/invalid_id

# API 禁用时
curl http://localhost:3000/api/vrchat/sponsors/YOUR_GUILD_ID
```

检查：
- [ ] 404 错误正确返回
- [ ] 403 错误正确返回

### 4. 事件测试

#### 成员加入测试
- [ ] 新成员加入服务器
- [ ] 日志显示"New member joined"
- [ ] 数据库中创建记录

#### 成员离开测试
- [ ] 成员离开服务器
- [ ] 日志显示"User left"
- [ ] 数据库中删除记录（包括绑定）

#### Bot 加入新服务器测试
- [ ] Bot 加入新服务器
- [ ] 自动同步所有成员
- [ ] 日志显示同步完成

---

## 📊 监控指标

### 性能检查
- [ ] 内存使用稳定（<200MB for small servers）
- [ ] CPU 使用正常（<5% idle）
- [ ] 数据库连接正常
- [ ] API 响应时间 <100ms

### 日志检查
- [ ] 无错误日志
- [ ] 同步日志正常
- [ ] API 调用日志正常

---

## 🐛 常见问题排查

### Bot 无法启动
1. 检查 `DISCORD_TOKEN` 是否正确
2. 检查 `MONGO_URI` 是否可连接
3. 查看完整错误信息

### 命令不显示
1. 重新运行 `pnpm run register`
2. 等待 1-2 分钟（Discord 缓存）
3. 检查 Bot 是否有 `applications.commands` scope

### 无法同步成员
1. 检查 Bot 是否有 `SERVER MEMBERS INTENT`
2. 检查 Bot 是否有查看成员的权限
3. 查看日志中的错误信息

### API 返回空数据
1. 检查是否有用户绑定了 VRChat 名字
2. 检查用户是否有角色
3. 检查 API 是否已启用

### 数据库连接失败
1. 检查 MongoDB Atlas IP 白名单
2. 检查连接字符串格式
3. 检查数据库用户权限

---

## 🎉 部署完成

所有检查项通过后，Bot 已准备好生产环境使用！

### 生产环境建议
1. 使用 PM2 或 systemd 管理进程
2. 设置自动重启
3. 配置日志轮转
4. 监控内存和 CPU 使用
5. 定期备份数据库
6. 设置错误告警

### PM2 部署示例
```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start dist/index.js --name vrchat-bot

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs vrchat-bot

# 重启
pm2 restart vrchat-bot
```

---

## 📞 支持

如有问题，请检查：
1. README.md - 完整文档
2. GitHub Issues - 已知问题
3. Discord.js 文档 - API 参考
4. MongoDB 文档 - 数据库帮助
