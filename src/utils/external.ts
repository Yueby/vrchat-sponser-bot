import { Guild as DiscordGuild } from 'discord.js';
import { randomBytes } from 'crypto';
import User, { IUser } from '../models/User';
import { logger } from './logger';

/**
 * 为手动添加的用户生成随机且唯一的 userId
 */
export function generateRandomId(): string {
  return `ext_${randomBytes(6).toString('hex')}`;
}

/**
 * 验证角色名称
 */
export function validateRoles(guild: DiscordGuild, roleNames: string[]): { valid: boolean; error?: string } {
  if (!roleNames || roleNames.length === 0) {
    return { valid: false, error: 'At least one role must be provided' };
  }
  return { valid: true };
}

/**
 * 查找用户（支持各种标识符）
 */
export async function findUser(
  guildId: string,
  identifier: string
): Promise<IUser | null> {
  try {
    return await User.findOne({ 
      guildId, 
      $or: [
        { userId: identifier },
        { displayName: identifier }
      ] 
    });
  } catch (error) {
    logger.error('Error finding user:', error);
    return null;
  }
}

/**
 * 解析角色字符串
 */
export function parseRoles(rolesString: string): string[] {
  return rolesString
    .split(',')
    .map(role => role.trim())
    .filter(role => role.length > 0);
}

/**
 * 获取默认头像
 */
export function getDefaultAvatar(): string {
  return 'https://cdn.discordapp.com/embed/avatars/0.png';
}

/**
 * 验证 Discord ID 格式
 */
export function validateDiscordId(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}
