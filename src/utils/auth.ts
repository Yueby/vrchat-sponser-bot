import jwt from 'jsonwebtoken';
import { logger } from './logger';

const { CLIENT_ID, DISCORD_CLIENT_SECRET, JWT_SECRET, DOMAIN, PORT } = process.env;

const REDIRECT_URI = DOMAIN 
  ? `https://${DOMAIN}/api/auth/callback` 
  : `http://localhost:${PORT || 3000}/api/auth/callback`;

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
  const scopes = ['identify', 'guilds'];
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * 授权码交换 Access Token
 */
export async function exchangeCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: DISCORD_CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const data = await response.json() as { access_token: string; error?: string };
  if (data.error) {
    throw new Error(`Token exchange failed: ${data.error}`);
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
  return jwt.sign(user, JWT_SECRET!, { expiresIn: '7d' });
}

/**
 * 验证 JWT
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET!);
  } catch (error) {
    return null;
  }
}
