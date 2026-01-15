// 输入验证工具
import { VRCHAT_NAME } from '../config/constants';

/**
 * VRChat 名称验证规则
 * - 长度：1-64 字符
 * - VRChat 支持几乎所有 Unicode 字符，不限制字符类型
 */
export function validateVRChatName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'VRChat name cannot be empty' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < VRCHAT_NAME.MIN_LENGTH) {
    return { valid: false, error: `VRChat name must be at least ${VRCHAT_NAME.MIN_LENGTH} character` };
  }

  if (trimmedName.length > VRCHAT_NAME.MAX_LENGTH) {
    return { valid: false, error: `VRChat name must be ${VRCHAT_NAME.MAX_LENGTH} characters or less` };
  }

  // VRChat 允许所有 Unicode 字符，只验证长度
  return { valid: true };
}

/**
 * Discord Guild ID 验证（Snowflake 格式）
 */
export function validateGuildId(guildId: string): boolean {
  // Discord Snowflake: 17-19 位数字
  return /^\d{17,19}$/.test(guildId);
}

/**
 * 清理和格式化 VRChat 名称
 */
export function sanitizeVRChatName(name: string): string {
  return name.trim().replace(/\s+/g, ' '); // 移除多余空格
}
