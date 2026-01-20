import { Schema, model, Document } from 'mongoose';

export interface IGuild extends Document {
  guildId: string;              // Discord 服务器 ID（主键）
  ownerId: string;              // 服务器所有者 ID（用于权限检查）
  apiEnabled: boolean;          // API 是否可访问（默认 true）
  managedRoleIds: string[];     // 要管理的角色 ID 列表（核心功能）
  notifyUserId?: string;        // 接收 changename 通知的用户 ID（可选）
  joinedAt: Date;               // Bot 加入时间
  lastSyncAt?: Date;            // 最后同步时间
  lastApiCallAt?: Date;         // 最后 API 调用时间
  isSyncing?: boolean;          // 是否正在同步中
}

const GuildSchema: Schema = new Schema({
  guildId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  apiEnabled: { type: Boolean, default: true },
  managedRoleIds: { type: [String], default: [] },
  notifyUserId: { type: String },
  joinedAt: { type: Date, default: Date.now },
  lastSyncAt: { type: Date },
  lastApiCallAt: { type: Date },
  isSyncing: { type: Boolean, default: false }
});

export default model<IGuild>('Guild', GuildSchema);
