// 应用常量配置

/**
 * 命令冷却时间配置
 */
export const COOLDOWNS = {
  CHANGENAME: 3000, // 3 秒
  CLEANUP_INTERVAL: 600000 // 10 分钟清理一次过期冷却
} as const;

/**
 * API 限制配置
 */
export const API_LIMITS = {
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 分钟
  RATE_LIMIT_MAX: 180, // 每分钟最多 180 次请求
  MAX_SPONSORS_PER_ROLE: 100 // 每个角色最多返回 100 个用户
} as const;

/**
 * VRChat 名称限制
 */
export const VRCHAT_NAME = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 32
} as const;

/**
 * 数据库批量操作配置
 */
export const DATABASE = {
  BULK_WRITE_BATCH_SIZE: 500 // 每批次最多 500 条记录
} as const;

/**
 * Embed 颜色配置
 */
export const EMBED_COLORS = {
  SUCCESS: 0x57F287,  // 绿色 - 成功操作
  ERROR: 0xED4245,    // 红色 - 错误/删除
  INFO: 0x5865F2,     // 蓝色 - 信息展示
  WARNING: 0xFEE75C   // 黄色 - 警告信息
} as const;
