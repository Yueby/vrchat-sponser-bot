import { Client, GatewayIntentBits, Interaction } from 'discord.js';
import mongoose from 'mongoose';
import { handleCommand } from './handlers/commandHandler';
import { handleGuildCreate, handleGuildDelete, syncAllGuilds } from './handlers/guildEvents';
import { handleMemberAdd, handleMemberRemove } from './handlers/memberEvents';
import { logger } from './utils/logger';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // Required for member events
  ]
});

// Bot 启动时自动同步所有服务器
client.once('ready', async () => {
  logger.bot(`Bot logged in as ${client.user?.tag}`);
  logger.network(`Connected to ${client.guilds.cache.size} servers`);
  
  // 自动同步所有服务器和成员
  await syncAllGuilds(client.guilds.cache);
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
