// API 类型定义

/**
 * VRChat 赞助者数据格式
 */
export interface SponsorData {
  userId: string;
  guildId: string;
  vrchatName: string;
  avatar: string;
  isBooster: boolean;
  joinedAt: string | null;
  supportDays: number;
  isExternal?: boolean;  // 标识是否为外部用户
}

/**
 * 角色分组数据（VRChat DataDictionary 格式）
 */
export interface RoleGroupData {
  [index: string]: SponsorData;
}

/**
 * API 响应格式
 */
export interface SponsorsApiResponse {
  [roleName: string]: RoleGroupData | string[];
  allRoles: string[];
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}
