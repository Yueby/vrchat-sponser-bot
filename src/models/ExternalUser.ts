import mongoose, { Document, Schema } from 'mongoose';

export interface IExternalUser extends Document {
  guildId: string;              // 所属服务器 ID
  vrchatName: string;           // VRChat 名字（主要标识）
  discordUserId?: string;       // Discord 用户 ID（可选）
  virtualRoles: string[];       // 虚拟角色名称数组
  displayName?: string;         // 显示名称（可选）
  addedBy: string;              // 添加者 ID
  addedAt: Date;                // 添加时间
  updatedAt: Date;              // 更新时间
  notes?: string;               // 备注信息（可选）
}

const ExternalUserSchema: Schema = new Schema({
  guildId: { type: String, required: true, index: true },
  vrchatName: { type: String, required: true },
  discordUserId: { type: String },
  virtualRoles: [{ type: String, required: true }],
  displayName: { type: String },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  notes: { type: String }
});

// 创建复合索引：vrchatName + guildId 唯一
ExternalUserSchema.index({ vrchatName: 1, guildId: 1 }, { unique: true });

// 创建稀疏索引：discordUserId + guildId 唯一（仅当 discordUserId 存在时）
ExternalUserSchema.index({ discordUserId: 1, guildId: 1 }, { unique: true, sparse: true });

// 优化排序查询性能：按 guildId 查询并按 addedAt 排序
ExternalUserSchema.index({ guildId: 1, addedAt: -1 });

export default mongoose.model<IExternalUser>('ExternalUser', ExternalUserSchema);
