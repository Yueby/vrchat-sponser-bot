import express from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { client } from './bot';
import { API_LIMITS, AVATAR_SIZES, SERVER } from './config/constants';
import DiscordUser from './models/DiscordUser';
import ExternalUser from './models/ExternalUser';
import Guild from './models/Guild';
import VRChatBinding from './models/VRChatBinding';
import { SponsorData, SponsorsApiResponse } from './types/api';
import { getDefaultAvatar } from './utils/external';
import { logger } from './utils/logger';

const app = express();

// 信任第一层反向代理（Cloudflare Worker）
// 设置为 1 表示只信任第一个代理，更安全
app.set('trust proxy', 1);

// Pterodactyl often uses SERVER_PORT, while others use PORT
const PORT = process.env.SERVER_PORT || process.env.PORT || SERVER.DEFAULT_PORT;

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: API_LIMITS.RATE_LIMIT_WINDOW,
  limit: API_LIMITS.RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: 'draft-8', // Use draft-8 RateLimit header standard
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Apply rate limiting to all /api/ paths
app.use('/api/', apiLimiter);

// 健康检查端点（用于容器平台检测）- 优先级最高，最快响应
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const isBotOnline = client.isReady();
  
  const allHealthy = isDbConnected && isBotOnline;
  const status = allHealthy ? 'ok' : 'degraded';
  const statusCode = allHealthy ? 200 : 503;
  
  res.status(statusCode).json({ 
    status,
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    services: {
      database: isDbConnected ? 'connected' : 'disconnected',
      discord: isBotOnline ? 'online' : 'offline',
      guilds: client.guilds.cache.size
    }
  });
});

app.get('/', (req, res) => {
  res.send('VRChat Sponsor Bot is running!');
});

// VRChat API Endpoint - Returns role-grouped DataDictionary structure
// Path parameter: guildId - Discord server ID
app.get('/api/vrchat/sponsors/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const startTime = Date.now();
  
  try {
    // 检查服务器是否存在且允许 API 访问
    const guild = await Guild.findOne({ guildId });
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // 检查是否配置了管理角色
    if (!guild.managedRoleIds || guild.managedRoleIds.length === 0) {
      return res.status(400).json({ error: 'No managed roles configured for this guild' });
    }
    
    if (!guild.apiEnabled) {
      return res.status(403).json({ error: 'API access disabled for this guild' });
    }
    
    // 更新 API 调用时间
    await Guild.updateOne({ guildId }, { lastApiCallAt: new Date() });
    
    // 查询该服务器的绑定数据（服务器成员）
    // 使用 .lean() 返回纯 JS 对象，提升性能 30-50%
    const bindings = await VRChatBinding.find({ guildId }).sort({ bindTime: -1 }).lean();
    
    // 查询外部用户数据
    const externalUsers = await ExternalUser.find({ guildId }).sort({ addedAt: -1 }).lean();
    
    // 获取 Discord 用户数据（roles）
    const discordUserIds = bindings.map(b => b.discordUserId);
    const discordUsers = await DiscordUser.find(
      { userId: { $in: discordUserIds }, guildId },
      'userId roles isBooster joinedAt'
    ).lean();
    
    // 过滤：只保留拥有管理角色的用户
    const managedRoleIds = new Set(guild.managedRoleIds);
    const filteredDiscordUsers = discordUsers.filter(user =>
      user.roles.some(roleId => managedRoleIds.has(roleId))
    );
    
    // 创建查找映射
    const discordUserMap = new Map(
      filteredDiscordUsers.map(user => [user.userId, user])
    );
    
    // 获取 Discord Guild 对象（用于实时查询）
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(500).json({ error: 'Discord guild not in cache' });
    }
    
    // 🚀 内存优化：按需获取成员，避免一次性缓存过多数据
    // 只获取必要的成员数据
    try {
      if (discordUserIds.length > 0) {
        // 分批获取，避免一次性缓存过多数据
        const batchSize = 100;
        for (let i = 0; i < discordUserIds.length; i += batchSize) {
          const batch = discordUserIds.slice(i, i + batchSize);
          // 逐个获取成员（会自动缓存，但受缓存限制控制）
          await Promise.all(
            batch.map(userId => 
              discordGuild.members.fetch(userId).catch(() => null)
            )
          );
        }
      }
    } catch (error) {
      logger.error('Failed to fetch members:', error);
      // 继续执行，使用缓存中已有的成员数据
    }
    
    // 按角色分组
    const roleGroups: Record<string, SponsorData[]> = {};
    const allRoles = new Set<string>();
    
    // 处理服务器成员绑定
    bindings.forEach(binding => {
      const discordUser = discordUserMap.get(binding.discordUserId);
      const member = discordGuild.members.cache.get(binding.discordUserId);
      
      // 实时获取 displayName
      const displayName = member?.displayName || binding.vrchatName;
      
      // 实时获取头像
      const user = client.users.cache.get(binding.discordUserId);
      const avatar = user?.displayAvatarURL({ size: AVATAR_SIZES.LARGE }) || '';
      
      // 实时获取角色名称
      const roleNames: string[] = [];
      if (discordUser?.roles) {
        discordUser.roles.forEach(roleId => {
          const role = discordGuild.roles.cache.get(roleId);
          if (role) roleNames.push(role.name);
        });
      }
      
      // 按角色分组（跳过没有角色的用户）
      if (roleNames.length > 0) {
        const userData: SponsorData = {
          vrchatName: binding.vrchatName,
          displayName,
          avatar,
          isBooster: discordUser?.isBooster || false,
          joinedAt: discordUser?.joinedAt?.toISOString() || null,
          supportDays: discordUser?.joinedAt 
            ? Math.floor((Date.now() - discordUser.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          isExternal: false
        };
        
        roleNames.forEach(roleName => {
          if (!roleGroups[roleName]) roleGroups[roleName] = [];
          roleGroups[roleName].push(userData);
          allRoles.add(roleName);
        });
      }
    });
    
    // 处理外部用户
    externalUsers.forEach(externalUser => {
      // 使用虚拟角色名称
      const roleNames = externalUser.virtualRoles;
      
      // 跳过没有角色的外部用户
      if (roleNames.length === 0) return;
      
      // 获取头像
      let avatar = getDefaultAvatar();
      if (externalUser.discordUserId) {
        const user = client.users.cache.get(externalUser.discordUserId);
        avatar = user?.displayAvatarURL({ size: AVATAR_SIZES.LARGE }) || avatar;
      }
      
      // 计算支持天数
      const supportDays = Math.floor((Date.now() - externalUser.addedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      const userData: SponsorData = {
        vrchatName: externalUser.vrchatName,
        displayName: externalUser.displayName || externalUser.vrchatName,
        avatar,
        isBooster: false,  // 外部用户不能是 Booster
        joinedAt: externalUser.addedAt.toISOString(),
        supportDays,
        isExternal: true
      };
      
      roleNames.forEach(roleName => {
        if (!roleGroups[roleName]) roleGroups[roleName] = [];
        roleGroups[roleName].push(userData);
        allRoles.add(roleName);
      });
    });
    
    // 如果没有任何数据，返回空对象
    if (allRoles.size === 0) {
      return res.json({});
    }
    
    // 构建最终结果（VRChat DataDictionary 格式）
    const result = {} as SponsorsApiResponse;
    for (const [role, group] of Object.entries(roleGroups)) {
      const roleData: Record<string, SponsorData> = {};
      group.forEach((user, index) => {
        roleData[index.toString()] = user;
      });
      result[role] = roleData;
    }
    
    result.allRoles = Array.from(allRoles);
    
    // 记录 API 请求日志
    const totalUsers = bindings.length + externalUsers.length;
    const duration = Date.now() - startTime;
    logger.info(`API request: guild=${guildId}, users=${totalUsers}, roles=${allRoles.size}, duration=${duration}ms`);
    
    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`API Error for guild ${guildId} (duration: ${duration}ms):`, error);
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

export const startServer = () => {
  const port = Number(PORT);
  const server = app.listen(port, '0.0.0.0', () => {
    logger.info('');
    logger.info('[Web Server]');
    logger.success(`Listening on port ${port}`);
  });
  
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use`);
      process.exit(1);
    } else {
      logger.error('Server error:', error);
      process.exit(1);
    }
  });
  
  return server;
};
