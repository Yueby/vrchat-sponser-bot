# 📐 Embed 设计规范

所有 Bot 命令的 Embed 消息遵循统一的设计风格。

## 🎨 设计标准

### 1. 结构组成
每个 Embed 必须包含以下元素（按顺序）：

```typescript
new EmbedBuilder()
  .setAuthor({ name, iconURL })     // 操作主体标识
  .setTitle('emoji + 标题')         // 简洁标题
  .setDescription('描述文本')       // 简短说明
  .setColor(颜色代码)               // 状态颜色
  .setThumbnail(图标URL)            // 相关图标
  .addFields([...])                 // 结构化信息
  .setFooter({ text, iconURL })     // 操作者 + 服务器
  .setTimestamp()                   // 时间戳
```

### 2. 颜色体系

| 状态 | 颜色代码 | 十六进制 | 用途 |
|------|----------|----------|------|
| 成功/启用 | `0x57F287` | #57F287 | 操作成功、功能启用 |
| 删除/禁用 | `0xED4245` | #ED4245 | 删除操作、功能禁用 |
| 信息/中性 | `0x5865F2` | #5865F2 | 信息展示、查询结果 |
| 成员颜色 | `member.displayColor` | 动态 | 用户相关操作 |

### 3. 图标尺寸标准

- **Author Icon**: 64x64px
- **Thumbnail**: 128-256px
- **Footer Icon**: 64px

---

## 📋 命令实现示例

### `/changename` - 用户操作
```typescript
.setAuthor({
  name: member.displayName,
  iconURL: user.displayAvatarURL({ size: 256 })
})
.setTitle('✨ VRChat Binding Created')
.setColor(member.displayColor || 0x57F287)
.setFooter({
  text: `${guild.name} • Use /whoami to view full profile`,
  iconURL: guild.iconURL({ size: 64 })
})
```

### `/whoami` - 个人信息
```typescript
.setAuthor({
  name: member.displayName,
  iconURL: user.displayAvatarURL({ size: 256 })
})
.setTitle('👤 Your Profile Information')
.setColor(member.displayColor || 0x5865F2)
.setFooter({
  text: `Member of ${guild.name}`,
  iconURL: guild.iconURL({ size: 64 })
})
```

### `/admin sync` - 管理员操作
```typescript
.setAuthor({
  name: 'Admin Action: Manual Sync',
  iconURL: user.displayAvatarURL({ size: 64 })
})
.setTitle('✅ Database Sync Complete')
.setColor(0x57F287)
.setFooter({
  text: `Performed by ${user.username} • ${guild.name}`,
  iconURL: user.displayAvatarURL({ size: 64 })
})
```

### `/admin unbind` - 删除操作
```typescript
.setAuthor({
  name: 'Admin Action: Unbind User',
  iconURL: user.displayAvatarURL({ size: 64 })
})
.setTitle('✅ Unbind Successful')
.setColor(0xED4245) // 红色表示删除
.setFooter({
  text: `Performed by ${user.username} • ${guild.name}`,
  iconURL: user.displayAvatarURL({ size: 64 })
})
```

### `/server stats` - 服务器统计
```typescript
.setAuthor({
  name: guild.name,
  iconURL: guild.iconURL()
})
.setTitle('📊 Server Statistics & Configuration')
.setColor(apiEnabled ? 0x57F287 : 0x5865F2)
.setFooter({
  text: `Requested by ${user.username}`,
  iconURL: user.displayAvatarURL({ size: 64 })
})
```

### `/server api` - API 配置
```typescript
.setAuthor({
  name: guild.name,
  iconURL: guild.iconURL()
})
.setTitle(enabled ? '✅ API Access Enabled' : '🔒 API Access Disabled')
.setColor(enabled ? 0x57F287 : 0xED4245)
.setFooter({
  text: `Changed by ${user.username} • ${guild.name}`,
  iconURL: user.displayAvatarURL({ size: 64 })
})
```

---

## 🎯 设计原则

### 1. 一致性
- 所有命令使用相同的结构顺序
- Footer 格式统一：`操作者 • 服务器名`
- 颜色使用遵循语义化标准

### 2. 信息层级
- **Author**: 谁 / 什么操作
- **Title**: 操作结果
- **Description**: 简短说明
- **Fields**: 详细数据
- **Footer**: 上下文信息

### 3. 视觉清晰
- 使用 emoji 增强可读性
- 字段使用 `inline` 合理分布
- 关键信息使用 `**粗体**` 强调
- 代码块使用 `` `反引号` ``

### 4. 用户体验
- 所有时间戳使用 Discord 格式：`<t:timestamp:format>`
- 提供下一步操作提示
- 错误信息友好且具有指导性

---

## ✅ 检查清单

新增命令时，确保 Embed 包含：
- [ ] setAuthor - 操作主体
- [ ] setTitle - 带 emoji 的标题
- [ ] setDescription - 简短说明（可选但推荐）
- [ ] setColor - 符合规范的颜色
- [ ] setThumbnail - 相关图标（推荐）
- [ ] addFields - 结构化数据
- [ ] setFooter - 统一格式的 Footer
- [ ] setTimestamp - 时间戳

---

## 📦 完整命令列表

| 命令 | 类型 | 主色调 | Author |
|------|------|--------|--------|
| `/changename` | 用户 | 成员色/绿 | 成员名 |
| `/whoami` | 查询 | 成员色/蓝 | 成员名 |
| `/admin sync` | 管理 | 绿色 | Admin Action |
| `/admin unbind` | 管理 | 红色 | Admin Action |
| `/server stats` | 查询 | 动态 | 服务器名 |
| `/server api` | 配置 | 绿/红 | 服务器名 |

---

*最后更新: 2026-01-14*
