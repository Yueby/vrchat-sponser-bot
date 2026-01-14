import { Client, GatewayIntentBits, Interaction, Options } from 'discord.js';
import mongoose from 'mongoose';
import { handleCommand } from './handlers/commandHandler';
import { handleGuildCreate, handleGuildDelete, syncAllGuilds } from './handlers/guildEvents';
import { handleMemberAdd, handleMemberRemove } from './handlers/memberEvents';
import { logger } from './utils/logger';
import { logMemoryReport, startMemoryMonitor } from './utils/memory';

// 🚀 内存优化：配置缓存管理器和清理策略
export const client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // Required for member events
  ],
  // 配置缓存限制
  makeCache: Options.cacheWithLimits({
    // 限制成员缓存（最大内存优化点）
    GuildMemberManager: {
      maxSize: 200, // 每个服务器最多缓存 200 个成员
      keepOverLimit: (member) => false // 允许清理所有成员
    },
    // 限制用户缓存
    UserManager: {
      maxSize: 200 // 最多缓存 200 个用户
    },
    // 限制消息缓存（我们不需要消息）
    MessageManager: 0,
    // 其他缓存使用默认值
    ...Options.DefaultMakeCacheSettings
  }),
  // 清理策略：定期清理旧缓存
  sweepers: {
    ...Options.DefaultSweeperSettings,
    // 每 30 分钟清理一次成员缓存
    guildMembers: {
      interval: 1800, // 30 分钟（秒）
      filter: () => () => true // 清理所有成员（按需重新获取）
    },
    // 每 15 分钟清理一次用户缓存
    users: {
      interval: 900, // 15 分钟（秒）
      filter: () => () => true // 清理所有用户（按需重新获取）
    }
  }
});

// Bot 启动时自动同步所有服务器
client.once('ready', async () => {
  logger.bot(`Bot logged in as ${client.user?.tag}`);
  logger.network(`Connected to ${client.guilds.cache.size} servers`);
      
  // 自动同步所有服务器
  await syncAllGuilds(client.guilds.cache);
  
  // 🚀 启动内存监控（每 5 分钟）
  startMemoryMonitor(5);
  
  // 打印初始内存报告
  setTimeout(() => {
    logMemoryReport();
  }, 10000); // 10 秒后打印
});

// Bot 加入新服务器
client.on('guildCreate', handleGuildCreate);

// Bot 离开服务器
client.on('guildDelete', handleGuildDelete);

// 成员加入服务器
client.on('guildMemberAdd', handleMemberAdd);

// 成员离开服务器
client.on('guildMemberRemove', handleMemberRemove);

// 处理斜杠命令
client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleCommand(interaction);
});

// 🔧 错误处理：捕获 Discord.js 错误
client.on('error', (error) => {
  logger.error('Discord Client Error:', error);
});

client.on('warn', (warning) => {
  logger.warn('Discord Client Warning:', warning);
});

// 🔧 错误处理：WebSocket 重连
client.on('shardDisconnect', (event, shardId) => {
  logger.warn(`Shard ${shardId} disconnected`, event);
});

client.on('shardReconnecting', (shardId) => {
  logger.info(`Shard ${shardId} reconnecting...`);
});

client.on('shardResume', (shardId, replayedEvents) => {
  logger.success(`Shard ${shardId} resumed (${replayedEvents} events replayed)`);
});

// Database connection function
export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not defined');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });
    logger.success('Connected to MongoDB Atlas');
  } catch (error) {
    logger.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};
