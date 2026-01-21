// 数据库批量操作工具
import { GuildMember } from "discord.js";
import User from "../models/User";
import GuildModel from "../models/Guild";
import VRChatBindingModel from "../models/VRChatBinding";
import { getMemberRoleIds, isMemberBooster } from "./discord";

/**
 * 批量更新或创建 Discord 用户数据
 * 使用 bulkWrite 大幅提升性能
 */
export async function bulkUpsertDiscordUsers(
  members: GuildMember[],
  guildId: string,
): Promise<{ upsertedCount: number; modifiedCount: number }> {
  if (members.length === 0) {
    return { upsertedCount: 0, modifiedCount: 0 };
  }

  const operations = members
    .filter((member) => !member.user.bot)
    .map((member) => ({
      updateOne: {
        filter: { userId: member.id, guildId },
        update: {
          $set: {
            userType: "discord" as const,
            roles: getMemberRoleIds(member),
            isBooster: isMemberBooster(member),
            joinedAt: member.joinedAt || new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

  if (operations.length === 0) {
    return { upsertedCount: 0, modifiedCount: 0 };
  }

  const result = await User.bulkWrite(operations);

  return {
    upsertedCount: result.upsertedCount || 0,
    modifiedCount: result.modifiedCount || 0,
  };
}

/**
 * 批量删除指定服务器的用户数据
 */
export async function bulkDeleteGuildData(guildId: string) {
  const [guildResult, usersResult, bindingsResult] = await Promise.all([
    GuildModel.deleteOne({ guildId }),
    User.deleteMany({ guildId }),
    VRChatBindingModel.deleteMany({ guildId }),
  ]);

  return {
    guilds: guildResult.deletedCount || 0,
    users: usersResult.deletedCount || 0,
    bindings: bindingsResult.deletedCount || 0,
  };
}
