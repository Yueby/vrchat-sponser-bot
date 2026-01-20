import jwt from 'jsonwebtoken';
import { logger } from './logger';

const { PORT } = process.env;

// 动态构建 Redirect URI，避免静态加载时 DOMAIN 未就绪
const getRedirectUri = () => {
  const domain = process.env.DOMAIN;
  return domain 
  ? `https://${domain}/api/auth/callback` 
  : `http://localhost:${process.env.PORT || 3000}/api/auth/callback`;
};

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  public_flags: number;
  flags: number;
  banner: string | null;
  accent_color: number | null;
  global_name: string | null;
  avatar_decoration_data: any;
  banner_color: string | null;
  mfa_enabled: boolean;
  locale: string;
  premium_type: number;
}

/**
 * 获取 Discord 授权地址
 */
export function getDiscordAuthUrl(): string {
  const clientId = process.env.CLIENT_ID;
  if (!clientId) throw new Error('CLIENT_ID is missing in environment variables');

  const scopes = ['identify', 'guilds'];
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: scopes.join(' '),
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * 授权码交换 Access Token
 */
export async function exchangeCode(code: string): Promise<string> {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('CLIENT_ID or DISCORD_CLIENT_SECRET is missing');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const data = await response.json() as { access_token: string; error?: string };
  if (data.error) {
    logger.error('Token exchange error data:', data);
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

/**
 * 获取用户信息
 */
export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info from Discord');
  }

  return await response.json() as DiscordUser;
}

/**
 * 生成 JWT
 */
export function signToken(user: { id: string; username: string; avatar: string | null }): string {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing');
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
}

/**
 * 验证 JWT
 */
export function verifyToken(token: string): any {
  if (!process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}
