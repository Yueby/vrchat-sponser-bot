import mongoose, { Document, Schema } from 'mongoose';

export interface IVRChatBinding extends Document {
  discordUserId: string;        // Discord 用户 ID
  guildId: string;              // 服务器 ID（外键）
  vrchatName: string;           // VRChat 显示名（核心数据）
  firstBindTime: Date;          // 首次绑定时间（历史记录）
  bindTime: Date;               // 最后绑定/更新时间
  nameHistory?: Array<{         // 名称变更历史（可选）
    name: string;
    changedAt: Date;
  }>;
}

const VRChatBindingSchema: Schema = new Schema({
  discordUserId: { type: String, required: true },
  guildId: { type: String, required: true },
  vrchatName: { type: String, required: true },
  firstBindTime: { type: Date, default: Date.now },
  bindTime: { type: Date, default: Date.now },
  nameHistory: [{
    name: { type: String, required: true },
    changedAt: { type: Date, default: Date.now }
  }]
});

// 创建复合索引（discordUserId + guildId 作为唯一标识）
VRChatBindingSchema.index({ discordUserId: 1, guildId: 1 }, { unique: true });

// 优化 API 查询性能：按 guildId 查询并按 bindTime 排序
VRChatBindingSchema.index({ guildId: 1, bindTime: -1 });

export default mongoose.model<IVRChatBinding>('VRChatBinding', VRChatBindingSchema);
