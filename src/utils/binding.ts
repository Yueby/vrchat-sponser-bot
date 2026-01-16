// 绑定进度计算和角色检查工具函数
import { Guild, GuildMember } from 'discord.js';
import { client } from '../bot';
import DiscordUser from '../models/DiscordUser';
import GuildModel from '../models/Guild';
import VRChatBinding from '../models/VRChatBinding';
import { logger } from './logger';

/**
 * 检查用户是否拥有管理的角色
 * @param guildId 服务器 ID
 * @param userId 用户 ID
 * @returns boolean
 */
export async function hasManagedRole(
  guildId: string,
  userId: string
): Promise<boolean> {
  try {
    // 获取服务器配置
    const guild = await GuildModel.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) {
      return false;
    }

    // 获取 Discord Guild 对象
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return false;
    }

    // 获取成员
    const member = await discordGuild.members.fetch(userId).catch(() => null);
    if (!member) {
      return false;
    }

    // 检查成员是否拥有任何一个管理的角色
    return member.roles.cache.some(role => guild.managedRoleIds.includes(role.id));
  } catch (error) {
    logger.error('Error checking managed role:', error);
    return false;
  }
}

/**
 * 获取拥有指定角色的所有成员
 * @param guild Discord Guild 对象
 * @param roleIds 角色 ID 列表
 * @returns 成员数组
 */
export async function getMembersWithRoles(
  guild: Guild,
  roleIds: string[]
): Promise<GuildMember[]> {
  try {
    // 获取所有成员
    await guild.members.fetch();
    
    // 过滤出拥有指定角色的成员（排除 Bot）
    const members = guild.members.cache.filter(member => {
      if (member.user.bot) return false;
      return member.roles.cache.some(role => roleIds.includes(role.id));
    });

    return Array.from(members.values());
  } catch (error) {
    logger.error('Error fetching members with roles:', error);
    return [];
  }
}

/**
 * 计算绑定进度
 * @param guildId 服务器 ID
 * @returns { bound: number, total: number, percentage: number }
 */
export async function calculateBindingProgress(
  guildId: string
): Promise<{ bound: number; total: number; percentage: number }> {
  try {
    // 获取服务器配置
    const guild = await GuildModel.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) {
      return { bound: 0, total: 0, percentage: 0 };
    }

    // 获取 Discord Guild 对象
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return { bound: 0, total: 0, percentage: 0 };
    }

    // 获取拥有管理角色的所有成员
    const members = await getMembersWithRoles(discordGuild, guild.managedRoleIds);
    const total = members.length;

    if (total === 0) {
      return { bound: 0, total: 0, percentage: 0 };
    }

    // 获取这些成员中已绑定的用户
    const memberIds = members.map(m => m.id);
    const boundCount = await VRChatBinding.countDocuments({
      guildId,
      discordUserId: { $in: memberIds }
    });

    const percentage = Math.round((boundCount / total) * 100);

    return { bound: boundCount, total, percentage };
  } catch (error) {
    logger.error('Error calculating binding progress:', error);
    return { bound: 0, total: 0, percentage: 0 };
  }
}

/**
 * 获取未绑定的成员列表（仅指定角色）
 * @param guildId 服务器 ID
 * @returns 未绑定的成员数组
 */
export async function getUnboundMembers(
  guildId: string
): Promise<Array<{ userId: string; username: string; displayName: string; roles: string[] }>> {
  try {
    // 获取服务器配置
    const guild = await GuildModel.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) {
      return [];
    }

    // 获取 Discord Guild 对象
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return [];
    }

    // 获取拥有管理角色的所有成员
    const members = await getMembersWithRoles(discordGuild, guild.managedRoleIds);

    // 获取已绑定的用户 ID
    const bindings = await VRChatBinding.find({ guildId }, 'discordUserId').lean();
    const boundUserIds = new Set(bindings.map(b => b.discordUserId));

    // 过滤出未绑定的成员
    const unboundMembers = members
      .filter(member => !boundUserIds.has(member.id))
      .map(member => ({
        userId: member.id,
        username: member.user.username,
        displayName: member.displayName,
        roles: Array.from(member.roles.cache.keys())
      }));

    return unboundMembers;
  } catch (error) {
    logger.error('Error getting unbound members:', error);
    return [];
  }
}
