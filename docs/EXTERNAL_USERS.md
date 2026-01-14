# 外部用户管理指南

## 概述

外部用户功能允许你添加无法加入 Discord 服务器的用户（如中国地区用户），他们的信息会出现在 VRChat API 返回中。

## 使用场景

- 🌏 **地区限制**：无法访问 Discord 的用户
- 📱 **无 Discord 账号**：不使用 Discord 的赞助者
- 🎮 **仅 VRChat 用户**：只在 VRChat 中活跃的用户

## 命令详解

### `/external add` - 添加外部用户

添加一个新的外部用户到系统中。

**语法**：
```
/external add vrchat_name:<VRChat名字> roles:<角色名,逗号分隔> [discord_user_id:<Discord ID>] [display_name:<显示名>] [notes:<备注>]
```

**参数说明**：
- `vrchat_name` (必需)：VRChat 显示名称，1-32 字符
- `roles` (必需)：角色名称，用逗号分隔，必须是服务器现有角色
- `discord_user_id` (可选)：Discord 用户 ID，如果用户有 Discord 账号
- `display_name` (可选)：自定义显示名称
- `notes` (可选)：备注信息，用于管理

**示例**：
```
# 基础添加
/external add vrchat_name:VRChatUser123 roles:VIP,Supporter

# 完整添加
/external add vrchat_name:VRChatUser123 roles:VIP discord_user_id:123456789012345678 display_name:小明 notes:通过爱发电赞助
```

**注意事项**：
- VRChat 名称在同一服务器内必须唯一
- 角色名称必须完全匹配服务器中的角色（区分大小写）
- Discord ID 如果提供，也必须唯一

---

### `/external update` - 更新外部用户

更新已存在的外部用户信息。

**语法**：
```
/external update identifier:<VRChat名字或Discord ID> [vrchat_name:<新名字>] [roles:<新角色>] [display_name:<新显示名>] [notes:<新备注>]
```

**参数说明**：
- `identifier` (必需)：VRChat 名字或 Discord ID，用于查找用户
- 其他参数均为可选，提供哪个就更新哪个

**示例**：
```
# 更新角色
/external update identifier:VRChatUser123 roles:VIP,Premium

# 更新多个字段
/external update identifier:VRChatUser123 display_name:新名字 notes:更新备注
```

---

### `/external remove` - 删除外部用户

从系统中删除外部用户。

**语法**：
```
/external remove identifier:<VRChat名字或Discord ID>
```

**示例**：
```
/external remove identifier:VRChatUser123
```

**注意**：删除操作不可恢复，请谨慎操作。

---

### `/external list` - 列出外部用户

查看所有外部用户列表。

**语法**：
```
/external list [role:<角色名>]
```

**参数说明**：
- `role` (可选)：按角色筛选

**示例**：
```
# 查看所有外部用户
/external list

# 查看特定角色的外部用户
/external list role:VIP
```

**特点**：
- 每页显示 10 个用户
- 按添加时间倒序排列
- 显示 VRChat 名字、角色、添加时间

---

## 数据结构

### 外部用户包含以下信息：

| 字段 | 说明 | 必需 |
|------|------|------|
| `vrchatName` | VRChat 显示名称 | ✅ |
| `virtualRoles` | 虚拟角色名称数组 | ✅ |
| `guildId` | 所属服务器 ID | ✅ |
| `addedBy` | 添加者 ID | ✅ |
| `addedAt` | 添加时间 | ✅ |
| `updatedAt` | 最后更新时间 | ✅ |
| `discordUserId` | Discord 用户 ID | ❌ |
| `displayName` | 自定义显示名称 | ❌ |
| `notes` | 备注信息 | ❌ |

---

## API 返回格式

外部用户会出现在 `/api/vrchat/sponsors/:guildId` 的返回中：

```json
{
  "VIP": {
    "0": {
      "vrchatName": "VRChatUser123",
      "displayName": "小明",
      "avatar": "https://cdn.discordapp.com/embed/avatars/0.png",
      "isBooster": false,
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "supportDays": 30,
      "isExternal": true
    }
  },
  "allRoles": ["VIP"]
}
```

**外部用户特征**：
- `isExternal` 为 `true`
- `isBooster` 始终为 `false`（外部用户不能是 Booster）
- `joinedAt` 为添加到系统的时间
- `avatar` 为默认头像（除非关联了 Discord 账号）

---

## 虚拟角色说明

### 什么是虚拟角色？

虚拟角色是指外部用户使用的角色名称，它们：
- 使用服务器现有的角色名称
- 不是真实的 Discord 角色
- 仅用于 API 分组显示

### 角色验证

添加或更新外部用户时，系统会验证：
1. 角色名称是否存在于服务器
2. 角色名称是否完全匹配（区分大小写）
3. 至少提供一个角色

### 角色管理建议

1. **保持一致**：外部用户使用与服务器成员相同的角色名称
2. **定期检查**：如果服务器角色改名，需要更新外部用户的角色
3. **分组清晰**：合理分配角色，便于在 VRChat 中展示

---

## 最佳实践

### 1. 命名规范

**VRChat 名称**：
- 使用用户在 VRChat 中的实际显示名
- 避免特殊字符和表情符号
- 保持 1-32 字符长度

**显示名称**：
- 可以使用中文或其他语言
- 用于更友好的展示
- 如果不提供，默认使用 VRChat 名称

### 2. 角色分配

- 根据赞助等级分配角色（如 VIP、Premium、Supporter）
- 可以分配多个角色
- 保持与服务器成员的角色体系一致

### 3. 备注管理

使用备注字段记录：
- 赞助渠道（如爱发电、Patreon）
- 赞助金额或等级
- 到期时间
- 其他重要信息

**示例**：
```
/external add vrchat_name:User123 roles:VIP notes:爱发电月度赞助 ¥30/月 到期:2024-12-31
```

### 4. Discord 账号关联

如果外部用户有 Discord 账号（但无法加入服务器）：
- 提供 `discord_user_id` 参数
- 系统会尝试获取其头像
- 便于后续可能的迁移

---

## 常见问题

### Q: 外部用户和服务器成员有什么区别？

**服务器成员**：
- 实际加入了 Discord 服务器
- 使用 `/changename` 自己绑定
- 可以是 Server Booster
- 离开服务器时自动删除数据

**外部用户**：
- 未加入 Discord 服务器
- 由管理员手动添加
- 不能是 Server Booster
- 需要手动删除

### Q: 外部用户可以使用 Bot 命令吗？

不可以。外部用户：
- 无法使用 `/changename`
- 无法使用 `/whoami`
- 所有信息由管理员管理

### Q: 如何批量导入外部用户？

目前需要逐个使用 `/external add` 添加。未来版本可能会支持批量导入功能。

### Q: 外部用户的头像从哪里来？

- 如果提供了 `discord_user_id`，尝试获取 Discord 头像
- 否则使用 Discord 默认头像
- 无法自定义上传头像

### Q: 外部用户会占用服务器成员位吗？

不会。外部用户：
- 不在 Discord 服务器中
- 不占用成员槽位
- 仅存在于 Bot 数据库中

### Q: 外部用户数据会自动同步吗？

不会。外部用户数据完全由管理员手动管理：
- 添加：`/external add`
- 更新：`/external update`
- 删除：`/external remove`

---

## 权限要求

所有 `/external` 命令都需要：
- ✅ 服务器管理员权限
- ✅ 在服务器频道中使用（不支持私信）

---

## 技术细节

### 数据库索引

- `(vrchatName, guildId)` - 唯一索引
- `(discordUserId, guildId)` - 唯一稀疏索引
- `guildId` - 查询索引

### API 性能

- 外部用户与服务器成员一起查询
- 使用相同的角色分组逻辑
- 对 API 响应时间影响极小（<10ms）

---

## 示例工作流

### 场景：添加一个爱发电赞助者

1. **获取信息**：
   - VRChat 名字：`VRChatUser123`
   - 赞助等级：VIP（¥50/月）
   - Discord ID：无

2. **添加用户**：
```
/external add vrchat_name:VRChatUser123 roles:VIP display_name:小明 notes:爱发电月度赞助 ¥50/月
```

3. **验证**：
```
/external list role:VIP
```

4. **在 VRChat 中查看**：
   - API 会返回该用户
   - 显示在 VIP 分组中
   - 标记为外部用户

5. **后续管理**：
```
# 升级到 Premium
/external update identifier:VRChatUser123 roles:VIP,Premium

# 赞助到期，删除
/external remove identifier:VRChatUser123
```

---

## 相关文档

- [README.md](../README.md) - 项目总览
- [DEPLOYMENT.md](../DEPLOYMENT.md) - 部署指南
- [EMBED_DESIGN.md](EMBED_DESIGN.md) - Embed 设计规范

---

*最后更新: 2026-01-14*
