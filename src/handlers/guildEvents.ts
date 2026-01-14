// 服务器事件处理器
import { Guild as DiscordGuild } from 'discord.js';
import DiscordUser from '../models/DiscordUser';
import Guild from '../models/Guild';
import VRChatBinding from '../models/VRChatBinding';
import { bulkUpsertDiscordUsers } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * 处理 Bot 启动时的服务器同步
 */
export async function syncAllGuilds(guilds: Map<string, DiscordGuild>): Promise<void> {
  logger.sync('Syncing all guilds and members...');
  let totalGuilds = 0;
  let totalMembers = 0;
  
  for (const [guildId, guild] of guilds) {
    try {
      // 确保 Guild 记录存在（仅存储核心配置）
      await Guild.findOneAndUpdate(
        { guildId },
        {
          ownerId: guild.ownerId,
          joinedAt: guild.joinedAt || new Date(),
          lastSyncAt: new Date()
        },
        { upsert: true, setDefaultsOnInsert: true } // apiEnabled 默认 true
      );
      
      // 同步所有成员（使用批量操作提升性能）
      await guild.members.fetch();
      const members = Array.from(guild.members.cache.values());
      const { upsertedCount, modifiedCount } = await bulkUpsertDiscordUsers(members, guildId);
      const memberCount = upsertedCount + modifiedCount;
      
      totalGuilds++;
      totalMembers += memberCount;
      logger.success(`Synced ${guild.name}: ${memberCount} members`);
    } catch (error) {
      logger.error(`Failed to sync guild ${guild.name}:`, error);
    }
  }
  
  logger.celebrate(`Sync complete: ${totalGuilds} guilds, ${totalMembers} members`);
}

/**
 * 处理 Bot 加入新服务器
 */
export async function handleGuildCreate(guild: DiscordGuild): Promise<void> {
  try {
    logger.newGuild(`Bot joined new guild: ${guild.name} (${guild.id})`);
    
    // 自动创建服务器记录（仅核心配置）
    await Guild.create({
      guildId: guild.id,
      ownerId: guild.ownerId,
      apiEnabled: true, // 默认允许 API 访问
      joinedAt: new Date()
    });
    
    // 自动同步所有成员（使用批量操作）
    await guild.members.fetch();
    const members = Array.from(guild.members.cache.values());
    const { upsertedCount, modifiedCount } = await bulkUpsertDiscordUsers(members, guild.id);
    const memberCount = upsertedCount + modifiedCount;
    
    logger.success(`Guild setup complete: ${guild.name} (${memberCount} members synced)`);
  } catch (error) {
    logger.error(`Error setting up new guild ${guild.name}:`, error);
  }
}

/**
 * 处理 Bot 离开服务器
 */
export async function handleGuildDelete(guild: DiscordGuild): Promise<void> {
  try {
    logger.memberLeave(`Bot left guild: ${guild.name} (${guild.id})`);
    
    // 删除该服务器的所有数据
    const [guildResult, usersResult, bindingsResult] = await Promise.all([
      Guild.deleteOne({ guildId: guild.id }),
      DiscordUser.deleteMany({ guildId: guild.id }),
      VRChatBinding.deleteMany({ guildId: guild.id })
    ]);
    
    logger.delete(`Deleted data: Guild=${guildResult.deletedCount}, Users=${usersResult.deletedCount}, Bindings=${bindingsResult.deletedCount}`);
  } catch (error) {
    logger.error(`Error deleting guild data for ${guild.name}:`, error);
  }
}
