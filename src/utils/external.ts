// 外部用户管理工具函数
import { Guild as DiscordGuild, EmbedBuilder } from 'discord.js';
import { EMBED_COLORS } from '../config/constants';
import ExternalUser, { IExternalUser } from '../models/ExternalUser';
import { logger } from './logger';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  invalidRoles?: string[];
}

/**
 * 验证角色名称是否存在于服务器
 * @param guild Discord 服务器对象
 * @param roleNames 角色名称数组
 * @returns 验证结果
 */
export function validateRoles(guild: DiscordGuild, roleNames: string[]): ValidationResult {
  if (!roleNames || roleNames.length === 0) {
    return { valid: false, error: 'At least one role must be provided' };
  }

  const serverRoleNames = Array.from(guild.roles.cache.values())
    .map(role => role.name)
    .filter(name => name !== '@everyone');

  const invalidRoles = roleNames.filter(roleName => !serverRoleNames.includes(roleName));

  if (invalidRoles.length > 0) {
    return {
      valid: false,
      error: `Invalid role(s): ${invalidRoles.join(', ')}`,
      invalidRoles
    };
  }

  return { valid: true };
}

/**
 * 查找外部用户（支持通过 VRChat 名字或 Discord ID）
 * @param guildId 服务器 ID
 * @param identifier VRChat 名字或 Discord ID
 * @returns 外部用户对象或 null
 */
export async function findExternalUser(
  guildId: string,
  identifier: string
): Promise<IExternalUser | null> {
  try {
    // 先尝试通过 VRChat 名字查找
    let user = await ExternalUser.findOne({ guildId, vrchatName: identifier });

    // 如果没找到，尝试通过 Discord ID 查找
    if (!user && /^\d{17,19}$/.test(identifier)) {
      user = await ExternalUser.findOne({ guildId, discordUserId: identifier });
    }

    return user;
  } catch (error) {
    logger.error('Error finding external user:', error);
    return null;
  }
}

/**
 * 解析角色字符串为数组
 * @param rolesString 逗号分隔的角色字符串
 * @returns 角色名称数组
 */
export function parseRoles(rolesString: string): string[] {
  return rolesString
    .split(',')
    .map(role => role.trim())
    .filter(role => role.length > 0);
}

/**
 * 获取默认头像 URL
 * @returns 默认头像 URL
 */
export function getDefaultAvatar(): string {
  // Discord 默认头像
  return 'https://cdn.discordapp.com/embed/avatars/0.png';
}

/**
 * 验证 Discord User ID 格式
 * @param userId Discord User ID
 * @returns 是否有效
 */
export function validateDiscordUserId(userId: string): boolean {
  return /^\d{17,19}$/.test(userId);
}
