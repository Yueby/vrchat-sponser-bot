import { Client, GatewayIntentBits, Interaction, Options } from 'discord.js';
import mongoose from 'mongoose';
import { MONITORING } from './config/constants';
import { handleCommand } from './handlers/commandHandler';
import { handleGuildCreate, handleGuildDelete, syncAllGuilds } from './handlers/guildEvents';
import { handleMemberAdd, handleMemberRemove } from './handlers/memberEvents';
import { logger } from './utils/logger';
import { startMemoryMonitor } from './utils/memory';

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
client.once('clientReady', async () => {
  logger.bot(`Bot logged in as ${client.user?.tag}`);
  logger.network(`Connected to ${client.guilds.cache.size} servers`);
      
  // 自动同步所有服务器
  await syncAllGuilds(client.guilds.cache);
  
  // 🚀 启动内存监控
  startMemoryMonitor(MONITORING.MEMORY_CHECK_INTERVAL);
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
  logger.warn(`Shard ${shardId} disconnected - Code: ${event.code}, Reason: ${event.reason || 'Unknown'}`);
  if (event.code === 1000) {
    logger.info('Normal closure');
  } else if (event.code >= 4000) {
    logger.error(`Discord error code ${event.code} - this may indicate a serious issue`);
  }
});

client.on('shardReconnecting', (shardId) => {
  logger.info(`Shard ${shardId} reconnecting...`);
});

client.on('shardResume', (shardId, replayedEvents) => {
  logger.success(`Shard ${shardId} resumed (${replayedEvents} events replayed)`);
});

client.on('shardError', (error, shardId) => {
  logger.error(`Shard ${shardId} error:`, error);
});

// Database connection function
export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not defined');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,        // 最大连接数
      minPoolSize: 2,         // 最小连接数
      maxIdleTimeMS: 30000,   // 连接空闲后关闭
      retryWrites: true,      // 自动重试写操作
      retryReads: true        // 自动重试读操作
    });
    logger.success('Connected to MongoDB Atlas');
    
    // MongoDB 连接事件监听
    mongoose.connection.on('disconnected', () => {
      logger.error('MongoDB disconnected! Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.success('MongoDB reconnected successfully');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('MongoDB Connection Error:', error.message);
      logger.error('Stack:', error.stack);
    } else {
      logger.error('MongoDB Connection Error:', JSON.stringify(error));
    }
    logger.error('Please check:');
    logger.error('  1. MONGO_URI is correctly set in environment variables');
    logger.error('  2. MongoDB Atlas cluster is running');
    logger.error('  3. Network access is allowed (IP whitelist: 0.0.0.0/0)');
    process.exit(1);
  }
};
