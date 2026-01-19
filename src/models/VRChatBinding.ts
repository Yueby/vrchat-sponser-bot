import mongoose, { Document, Schema } from 'mongoose';

/**
 * VRChat 绑定信息模型
 * 核心变更：使用统一的 userId 关联，不再局限于 Discord ID
 */
export interface IVRChatBinding extends Document {
  userId: string;               // 用户唯一 ID (关联至 User.userId)
  guildId: string;              // 服务器 ID
  vrchatName: string;           // VRChat 显示名
  firstBindTime: Date;          // 首次绑定时间
  bindTime: Date;               // 最后绑定/更新时间
  nameHistory?: Array<{         // 名称变更历史
    name: string;
    changedAt: Date;
  }>;
}

const VRChatBindingSchema: Schema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  vrchatName: { type: String, required: true },
  firstBindTime: { type: Date, default: Date.now },
  bindTime: { type: Date, default: Date.now },
  nameHistory: [{
    name: { type: String, required: true },
    changedAt: { type: Date, default: Date.now }
  }]
});

// 唯一标识索引：userId + guildId
VRChatBindingSchema.index({ userId: 1, guildId: 1 }, { unique: true });
// 优化 API 查询性能
VRChatBindingSchema.index({ guildId: 1, bindTime: -1 });
VRChatBindingSchema.index({ vrchatName: 1 });

export default mongoose.model<IVRChatBinding>('VRChatBinding', VRChatBindingSchema);
