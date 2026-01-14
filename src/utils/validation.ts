// 输入验证工具

/**
 * VRChat 名称验证规则
 * - 长度：1-32 字符
 * - 允许字符：字母、数字、空格、下划线、连字符
 */
export function validateVRChatName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'VRChat name cannot be empty' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 32) {
    return { valid: false, error: 'VRChat name must be 32 characters or less' };
  }

  // 允许字母、数字、空格、下划线、连字符、常见 Unicode 字符
  const validNameRegex = /^[\w\s\-\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+$/;
  if (!validNameRegex.test(trimmedName)) {
    return { valid: false, error: 'VRChat name contains invalid characters' };
  }

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
