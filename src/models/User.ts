import { Schema, model, Document } from 'mongoose';

/**
 * 终极统一用户接口
 * 整合了原来的 DiscordUser、ExternalUser 和 UserBase
 */
export interface IUser extends Document {
  guildId: string;              // 服务器 ID
  userId: string;               // 用户唯一 ID (Discord ID 或生成的随机 ID)
  userType: 'discord' | 'manual'; // 用户类型
  displayName?: string;         // 显示名称 (自定义或 Discord 昵称)
  avatarUrl?: string;           // 自定义头像链接
  roles: string[];              // 角色 (Discord 角色 ID 数组 或 手动添加的虚拟角色名)
  isBooster: boolean;           // 是否为服务器 Booster
  joinedAt: Date;               // 加入/添加时间
  updatedAt: Date;              // 最后更新时间
  notes?: string;               // 备注信息
  addedBy?: string;             // 添加人 ID
}

const UserSchema: Schema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userType: { type: String, enum: ['discord', 'manual'], default: 'discord', required: true },
  displayName: { type: String },
  avatarUrl: { type: String },
  roles: [{ type: String }],
  isBooster: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  notes: { type: String },
  addedBy: { type: String }
});

// 在特定服务器中 userId 必须唯一
UserSchema.index({ userId: 1, guildId: 1 }, { unique: true });
// 优化查询排序
UserSchema.index({ guildId: 1, joinedAt: -1 });

export default model<IUser>('User', UserSchema);
