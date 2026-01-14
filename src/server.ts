import express from 'express';
import rateLimit from 'express-rate-limit';
import { client } from './bot';
import DiscordUser from './models/DiscordUser';
import Guild from './models/Guild';
import VRChatBinding from './models/VRChatBinding';

const app = express();
// Pterodactyl often uses SERVER_PORT, while others use PORT
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

// API rate limiting: max 180 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 180, // Limit each IP to 180 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: 'draft-8', // Use draft-8 RateLimit header standard
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Apply rate limiting to all /api/ paths
app.use('/api/', apiLimiter);

app.get('/', (req, res) => {
  res.send('VRChat Sponsor Bot is running! 🤖');
});

// VRChat API Endpoint - Returns role-grouped DataDictionary structure
// Path parameter: guildId - Discord server ID
app.get('/api/vrchat/sponsors/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // 检查服务器是否存在且允许 API 访问
    const guild = await Guild.findOne({ guildId });
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    if (!guild.apiEnabled) {
      return res.status(403).json({ error: 'API access disabled for this guild' });
    }
    
    // 更新 API 调用时间
    await Guild.updateOne({ guildId }, { lastApiCallAt: new Date() });
    
    // 查询该服务器的绑定数据
    const bindings = await VRChatBinding.find({ guildId }).sort({ bindTime: -1 });
    
    // 获取 Discord 用户数据（roles）
    const discordUserIds = bindings.map(b => b.discordUserId);
    const discordUsers = await DiscordUser.find(
      { userId: { $in: discordUserIds }, guildId },
      'userId roles isBooster joinedAt'
    );
    
    // 创建查找映射
    const discordUserMap = new Map(
      discordUsers.map(user => [user.userId, user])
    );
    
    // 获取 Discord Guild 对象（用于实时查询）
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(500).json({ error: 'Discord guild not in cache' });
    }
    
    // 按角色分组
    const roleGroups: Record<string, any[]> = {};
    const allRoles = new Set<string>();
    
    bindings.forEach(binding => {
      const discordUser = discordUserMap.get(binding.discordUserId);
      const member = discordGuild.members.cache.get(binding.discordUserId);
      
      // 实时获取 displayName
      const displayName = member?.displayName || binding.vrchatName;
      
      // 实时获取头像
      const user = client.users.cache.get(binding.discordUserId);
      const avatar = user?.displayAvatarURL({ size: 256 }) || '';
      
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
        const userData = {
          vrchatName: binding.vrchatName,
          displayName,
          avatar,
          isBooster: discordUser?.isBooster || false,
          joinedAt: discordUser?.joinedAt?.toISOString() || null,
          supportDays: discordUser?.joinedAt 
            ? Math.floor((Date.now() - discordUser.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0
        };
        
        roleNames.forEach(roleName => {
          if (!roleGroups[roleName]) roleGroups[roleName] = [];
          roleGroups[roleName].push(userData);
          allRoles.add(roleName);
        });
      }
    });
    
    // 构建最终结果（VRChat DataDictionary 格式）
    const result: Record<string, any> = {};
    Object.keys(roleGroups).forEach(role => {
      const group = roleGroups[role];
      const roleData: Record<string, any> = {};
      group.forEach((user, index) => {
        roleData[index.toString()] = user;
      });
      result[role] = roleData;
    });
    
    result.allRoles = Array.from(allRoles);
    
    res.json(result);
  } catch (error) {
    console.error('VRChat API Error:', error);
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

export const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🌍 Web server running on port ${PORT}`);
  });
};
