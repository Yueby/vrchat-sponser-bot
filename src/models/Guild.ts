import { Schema, model, Document } from 'mongoose';

export interface IGuild extends Document {
  guildId: string;              // Discord 服务器 ID（主键）
  ownerId: string;              // 服务器所有者 ID（用于权限检查）
  apiEnabled: boolean;          // API 是否可访问（默认 true）
  joinedAt: Date;               // Bot 加入时间
  lastSyncAt?: Date;            // 最后同步时间
  lastApiCallAt?: Date;         // 最后 API 调用时间
}

const GuildSchema: Schema = new Schema({
  guildId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  apiEnabled: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now },
  lastSyncAt: { type: Date },
  lastApiCallAt: { type: Date }
});

export default model<IGuild>('Guild', GuildSchema);
