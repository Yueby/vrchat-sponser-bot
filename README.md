# VRChat Sponsor Bot (Node.js + MongoDB)

这是一个基于 Node.js 和 MongoDB 的 Discord Bot，专为 VRChat Sponsor 名字绑定设计。

## ✨ 功能
- **`/changename [name]`**: 用户在 Discord 绑定名字，数据存入 MongoDB。
- **HTTP API**: `GET /api/users` 返回所有绑定用户的 JSON 列表（供 VRChat 脚本下载）。

## 🚀 Wispbyte 部署指南

### 1. 准备代码
你需要将本项目的所有文件上传到 Wispbyte 服务器的文件管理面板中。

### 2. 数据库准备
你需要一个 **MongoDB Connection String** (推荐使用 MongoDB Atlas 免费版)。
格式如：`mongodb+srv://admin:password@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority`

### 3. 配置 Wispbyte (Startup 选项卡)

1.  **Run Command (启动命令)**:
    ```bash
    node dist/index.js
    ```

2.  **Environment Variables (环境变量)**:
    你需要在面板中找到环境变量设置（或者在 `.env` 文件中设置）：
    *   `DISCORD_TOKEN`: 你的 Bot Token
    *   `CLIENT_ID`: 你的 Application ID
    *   `MONGO_URI`: 你的 MongoDB 连接字符串
    *   `PORT`: `3000` (通常 Wispbyte 会自动分配，或者你可以指定)

3.  **Additional Node Packages (额外包)**:
    在 Startup 页面的 **"Additional Node / Python Packages"** 框中填入：
    ```text
    discord.js mongoose dotenv express
    ```

### 4. 首次运行前：编译与注册命令

由于这是 TypeScript 项目，需要先编译成 JavaScript。
在 Wispbyte 的 **Console (控制台)** 中，依次运行：

```bash
# 1. 安装所有依赖
npm install

# 2. 编译 TypeScript (生成 dist 文件夹)
npm run build

# 3. 注册 /changename 命令 (只需运行一次)
npm run register
```

### 5. 启动
点击 **Start** 按钮。如果看到 `🤖 Bot logged in as ...` 和 `🌍 Web server running on port ...`，说明部署成功！

---

## 💻 本地开发

1. **安装依赖**: `pnpm install`
2. **配置 .env**: 填入 Token 和 Mongo URI。
3. **注册命令**: `pnpm run register`
4. **启动**: `pnpm run dev`
