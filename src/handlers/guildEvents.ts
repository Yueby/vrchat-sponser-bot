// 服务器事件处理器
import { Guild as DiscordGuild } from 'discord.js';
import DiscordUser from '../models/DiscordUser';
import Guild from '../models/Guild';
import VRChatBinding from '../models/VRChatBinding';
import { getMembersWithRoles } from '../utils/binding';
import { bulkUpsertDiscordUsers } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * 处理 Bot 启动时的服务器同步
 * 🚀 内存优化：仅同步服务器记录，不批量获取成员
 */
export async function syncAllGuilds(guilds: Map<string, DiscordGuild>): Promise<void> {
  logger.sync('Syncing all guilds...');
  let totalGuilds = 0;
  
  for (const [guildId, guild] of guilds) {
    try {
      // 仅确保 Guild 记录存在（不同步成员）
      await Guild.findOneAndUpdate(
        { guildId },
        {
          ownerId: guild.ownerId,
          joinedAt: guild.joinedAt || new Date(),
          lastSyncAt: new Date()
        },
        { upsert: true, setDefaultsOnInsert: true } // apiEnabled 默认 true
      );
      
      totalGuilds++;
      logger.success(`Synced guild: ${guild.name}`);
    } catch (error) {
      logger.error(`Failed to sync guild ${guild.name}:`, error);
    }
  }
  
  logger.celebrate(`Sync complete: ${totalGuilds} guilds (member sync on-demand)`);
}

/**
 * 处理 Bot 加入新服务器
 * 🚀 内存优化：仅创建服务器记录，成员在使用时按需同步
 */
export async function handleGuildCreate(guild: DiscordGuild): Promise<void> {
  try {
    logger.newGuild(`Bot joined new guild: ${guild.name} (${guild.id})`);
    
    // 仅创建服务器记录（不同步成员）
    await Guild.create({
      guildId: guild.id,
      ownerId: guild.ownerId,
      apiEnabled: true, // 默认允许 API 访问
      joinedAt: new Date()
    });
    
    logger.success(`Guild setup complete: ${guild.name} (members will sync on-demand)`);
  } catch (error) {
    logger.error(`Error setting up new guild ${guild.name}:`, error);
  }
}

/**
 * 同步指定角色的成员数据
 * @param guild Discord Guild 对象
 * @param roleIds 角色 ID 列表
 * @returns 同步的成员数量
 */
export async function syncRoleMembers(
  guild: DiscordGuild,
  roleIds: string[]
): Promise<number> {
  try {
    logger.sync(`Syncing members with roles in ${guild.name}...`);
    
    // 获取拥有指定角色的成员
    const members = await getMembersWithRoles(guild, roleIds);
    
    if (members.length === 0) {
      logger.info('No members found with specified roles');
      return 0;
    }

    // 批量更新 DiscordUser
    await bulkUpsertDiscordUsers(members, guild.id);
    
    // 更新服务器的最后同步时间
    await Guild.updateOne(
      { guildId: guild.id },
      { lastSyncAt: new Date() }
    );

    logger.success(`Synced ${members.length} members with specified roles`);
    return members.length;
  } catch (error) {
    logger.error('Error syncing role members:', error);
    return 0;
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
