import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'path';
import { client } from './bot';
import { API_LIMITS, AVATAR_SIZES, SERVER } from './config/constants';
import Guild from './models/Guild';
import User from './models/User';
import VRChatBinding from './models/VRChatBinding';
import { SponsorData, SponsorsApiResponse } from './types/api';
import { getDefaultAvatar } from './utils/external';
import { apiCache } from './utils/cache';
import { logger } from './utils/logger';
import * as auth from './utils/auth';

const app = express();
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'public')));
app.set('trust proxy', 1);

const PORT = process.env.SERVER_PORT || process.env.PORT || SERVER.DEFAULT_PORT;

const apiLimiter = rateLimit({
  windowMs: API_LIMITS.RATE_LIMIT_WINDOW,
  limit: API_LIMITS.RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

app.get('/ping', (req, res) => res.send('pong'));

app.get('/health', (req, res) => {
  const isDev = process.env.NODE_ENV === 'development';
  const isDbConnected = mongoose.connection.readyState === 1;
  const isBotOnline = client.isReady();
  const allHealthy = isDbConnected && (isDev || isBotOnline);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    services: {
      database: isDbConnected ? 'connected' : 'disconnected',
      discord: isBotOnline ? 'online' : 'offline'
    }
  });
});

app.get('/', (req, res) => res.send('VRChat Sponsor Bot is running.'));

// Auth Routes
app.get('/api/auth/login', (req, res) => {
  res.redirect(auth.getDiscordAuthUrl());
});

app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const accessToken = await auth.exchangeCode(code as string);
    const user = await auth.getDiscordUser(accessToken);
    const token = auth.signToken({
      id: user.id,
      username: user.global_name || user.username,
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    });

    // 从 Cookie 或 State 中获取原始跳转地址（此处简化，直接回首页或 Dashboard）
    res.redirect('/');
  } catch (error) {
    logger.error('Auth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const user = auth.verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  res.json(user);
});

app.get('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

app.get('/dashboard/:guildId', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html')));
app.get('/dashboard/:guildId/:userId', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'profile.html')));

/**
 * 统合后的 VRChat 赞助者列表 API
 */
app.get('/api/vrchat/sponsors/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const startTime = Date.now();

  try {
    const cachedData = apiCache.get<SponsorsApiResponse>(guildId);
    if (cachedData) return res.json(cachedData);

    const guild = await Guild.findOne({ guildId });
    if (!guild || !guild.apiEnabled) return res.status(403).json({ error: 'API access disabled or guild not found' });

    // 1. 获取该服务器所有 User 记录
    const users = await User.find({ guildId }).lean();
    if (users.length === 0) return res.json({});

    // 2. 获取所有绑定信息
    const bindings = await VRChatBinding.find({ guildId }).lean();
    const bindingMap = new Map(bindings.map(b => [b.userId, b]));

    // 3. 批量获取 Discord 成员 (仅限 Discord 来源用户)
    const discordUserIds = users.filter(u => u.userType === 'discord').map(u => u.userId);
    const memberMap = new Map();
    const discordGuild = client.isReady() ? client.guilds.cache.get(guildId) : null;
    
    if (discordGuild && discordUserIds.length > 0) {
      try {
        const members = await discordGuild.members.fetch({ user: discordUserIds });
        members.forEach(m => memberMap.set(m.id, m));
      } catch (e) { logger.warn('Member fetch error:', e); }
    }

    const roleGroups: Record<string, SponsorData[]> = {};
    const allRoles = new Set<string>();
    const managedRoleIds = new Set(guild.managedRoleIds);

    // 4. 处理统一的用户数据
    users.forEach(user => {
      const binding = bindingMap.get(user.userId);
      if (!binding) return; // 没绑定 VRChat 的不显示

      const member = memberMap.get(user.userId);
      const avatar = user.avatarUrl || member?.displayAvatarURL({ size: AVATAR_SIZES.LARGE }) || getDefaultAvatar();
      
      // 角色解析：Discord ID 转名 或 直接使用虚拟名
      const roleNames: string[] = [];
      if (user.userType === 'discord') {
        user.roles.forEach(roleId => {
          if (managedRoleIds.has(roleId)) {
            const role = discordGuild?.roles.cache.get(roleId);
            if (role) roleNames.push(role.name);
          }
        });
      } else {
        roleNames.push(...user.roles);
      }

      if (roleNames.length === 0) return;

      const userData: SponsorData = {
        userId: user.userId,
        guildId: user.guildId,
        vrchatName: binding.vrchatName,
        avatar,
        isBooster: user.isBooster,
        joinedAt: user.joinedAt.toISOString(),
        supportDays: Math.floor((Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24)),
        isExternal: user.userType === 'manual'
      };

      roleNames.forEach(roleName => {
        if (!roleGroups[roleName]) roleGroups[roleName] = [];
        roleGroups[roleName].push(userData);
        allRoles.add(roleName);
      });
    });

    const result = {} as SponsorsApiResponse;
    for (const [role, group] of Object.entries(roleGroups)) {
      result[role] = group.reduce((acc, user, idx) => ({ ...acc, [idx]: user }), {});
    }
    result.allRoles = Array.from(allRoles);

    apiCache.set(guildId, result);
    res.json(result);
  } catch (error) {
    logger.error(`API Error:`, error);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * 用户详情 API
 */
app.get('/api/vrchat/sponsors/:guildId/:userId', async (req, res) => {
  const { guildId, userId } = req.params;

  try {
    const user = await User.findOne({ userId, guildId }).lean();
    const binding = await VRChatBinding.findOne({ userId, guildId }).lean();
    if (!user || !binding) return res.status(404).json({ error: 'User not found' });

    const discordUser = client.isReady() ? client.users.cache.get(userId) : null;
    const discordGuild = client.isReady() ? client.guilds.cache.get(guildId) : null;
    const member = discordGuild ? discordGuild.members.cache.get(userId) : null;

    let roleNames: string[] = [];
    if (user.userType === 'discord' && discordGuild) {
      roleNames = user.roles.map(id => discordGuild.roles.cache.get(id)?.name).filter((n): n is string => !!n);
    } else {
      roleNames = user.roles;
    }

    res.json({
      userId,
      guildId,
      vrchatName: binding.vrchatName,
      displayName: user.displayName || member?.displayName || discordUser?.username || 'Unknown',
      avatar: user.avatarUrl || member?.displayAvatarURL({ size: AVATAR_SIZES.LARGE }) || getDefaultAvatar(),
      isBooster: user.isBooster,
      isExternal: user.userType === 'manual',
      joinedAt: user.joinedAt,
      supportDays: Math.floor((Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24)),
      bindTime: binding.bindTime,
      roles: roleNames,
      nameHistory: binding.nameHistory || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export const startServer = () => {
  const port = Number(PORT);
  return app.listen(port, '0.0.0.0', () => logger.success(`Server listening on port ${port}`));
};
