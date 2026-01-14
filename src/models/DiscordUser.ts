import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscordUser extends Document {
  userId: string;               // Discord 用户 ID
  guildId: string;              // 服务器 ID（外键）
  roles: string[];              // 角色 ID 数组
  isBooster: boolean;           // 是否为 Booster
  joinedAt: Date;               // 加入服务器时间
  updatedAt: Date;              // 最后更新时间
}

const DiscordUserSchema: Schema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true, index: true },
  roles: [{ type: String }],
  isBooster: { type: Boolean, default: false },
  joinedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

// 创建复合索引（userId + guildId 作为唯一标识）
DiscordUserSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model<IDiscordUser>('DiscordUser', DiscordUserSchema);
