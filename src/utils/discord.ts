// Discord 数据获取工具函数
import { Guild as DiscordGuild, GuildMember } from 'discord.js';
import { logger } from './logger';

/**
 * 获取成员的角色 ID 列表（排除 @everyone）
 */
export function getMemberRoleIds(member: GuildMember): string[] {
  return member.roles.cache
    .filter(role => role.name !== '@everyone')
    .map(role => role.id);
}

/**
 * 获取成员的角色名称列表（排除 @everyone）
 */
export function getMemberRoleNames(member: GuildMember): string[] {
  return member.roles.cache
    .filter(role => role.name !== '@everyone')
    .map(role => role.name);
}

/**
 * 检查成员是否是服务器 Booster
 */
export function isMemberBooster(member: GuildMember): boolean {
  return member.premiumSince !== null;
}

/**
 * 批量获取服务器成员（用于 API 性能优化）
 */
export async function fetchGuildMembers(
  guild: DiscordGuild,
  userIds: string[]
): Promise<Map<string, GuildMember>> {
  try {
    // 批量获取成员
    const members = await guild.members.fetch({ user: userIds });
    return members;
  } catch (error) {
    logger.error('Failed to fetch guild members:', error);
    return new Map();
  }
}

/**
 * 将角色 ID 数组转换为角色名称数组
 */
export function getRoleNamesFromIds(guild: DiscordGuild, roleIds: string[]): string[] {
  const roleNames: string[] = [];
  roleIds.forEach(roleId => {
    const role = guild.roles.cache.get(roleId);
    if (role) roleNames.push(role.name);
  });
  return roleNames;
}
