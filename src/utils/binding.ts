// 绑定进度计算和角色检查工具函数
import { Guild, GuildMember } from "discord.js";
import { client } from "../bot";
import GuildModel from "../models/Guild";
import VRChatBinding from "../models/VRChatBinding";
import { logger } from "./logger";

/**
 * 检查用户是否拥有管理的角色
 */
export async function hasManagedRole(
  guildId: string,
  userId: string,
): Promise<boolean> {
  try {
    const guild = await GuildModel.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) return false;
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) return false;
    const member = await discordGuild.members.fetch(userId).catch(() => null);
    if (!member) return false;
    return member.roles.cache.some((role) =>
      guild.managedRoleIds.includes(role.id),
    );
  } catch (error) {
    logger.error("Error checking managed role:", error);
    return false;
  }
}

/**
 * 获取拥有指定角色的所有成员
 */
export async function getMembersWithRoles(
  guild: Guild,
  roleIds: string[],
): Promise<GuildMember[]> {
  try {
    if (!roleIds || roleIds.length === 0) return [];
    // await guild.members.fetch(); // Disable force fetch to avoid Gateway Rate Limits (Opcode 8)
    // We rely on Server Members Intent and Cache.
    // Use /server sync or /admin refresh to force update if needed.
    const members = guild.members.cache.filter((member) => {
      if (member.user.bot) return false;
      return member.roles.cache.some((role) => roleIds.includes(role.id));
    });
    return Array.from(members.values());
  } catch (error) {
    logger.error("Error fetching members with roles:", error);
    return [];
  }
}

/**
 * 计算绑定进度
 */
export async function calculateBindingProgress(
  guildId: string,
): Promise<{ bound: number; total: number; percentage: number }> {
  try {
    const guild = await GuildModel.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0)
      return { bound: 0, total: 0, percentage: 0 };
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) return { bound: 0, total: 0, percentage: 0 };
    const members = await getMembersWithRoles(
      discordGuild,
      guild.managedRoleIds,
    );
    const total = members.length;
    if (total === 0) return { bound: 0, total: 0, percentage: 0 };
    const memberIds = members.map((m) => m.id);
    const boundCount = await VRChatBinding.countDocuments({
      guildId,
      userId: { $in: memberIds }, // 统一使用 userId
    });
    const percentage = Math.round((boundCount / total) * 100);
    return { bound: boundCount, total, percentage };
  } catch (error) {
    logger.error("Error calculating binding progress:", error);
    return { bound: 0, total: 0, percentage: 0 };
  }
}

/**
 * 未绑定成员数据接口
 */
export interface UnboundMember {
  userId: string;
  username: string;
  displayName: string;
  roles: string[];
}

/**
 * 获取未绑定的成员列表
 */
export async function getUnboundMembers(
  guildId: string,
): Promise<UnboundMember[]> {
  try {
    const guild = await GuildModel.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) return [];
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) return [];
    const members = await getMembersWithRoles(
      discordGuild,
      guild.managedRoleIds,
    );
    const bindings = await VRChatBinding.find({ guildId }, "userId").lean();
    const boundUserIds = new Set(bindings.map((b) => b.userId));
    return members
      .filter((member) => !boundUserIds.has(member.id))
      .map((member) => ({
        userId: member.id,
        username: member.user.username,
        displayName: member.displayName,
        roles: Array.from(member.roles.cache.keys()),
      }));
  } catch (error) {
    logger.error("Error getting unbound members:", error);
    return [];
  }
}
