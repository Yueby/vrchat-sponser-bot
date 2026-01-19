// 服务器事件处理器
import { Guild as DiscordGuild } from 'discord.js';
import User from '../models/User';
import Guild from '../models/Guild';
import VRChatBinding from '../models/VRChatBinding';
import { getMembersWithRoles } from '../utils/binding';
import { bulkUpsertDiscordUsers } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * 处理 Bot 启动时的服务器同步
 */
export async function syncAllGuilds(guilds: Map<string, DiscordGuild>): Promise<void> {
  logger.sync('Syncing all guilds...');
  let totalGuilds = 0;
  for (const [guildId, guild] of guilds) {
    try {
      await Guild.findOneAndUpdate(
        { guildId },
        {
          ownerId: guild.ownerId,
          joinedAt: guild.joinedAt || new Date(),
          lastSyncAt: new Date()
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
      totalGuilds++;
      logger.success(`Synced guild: ${guild.name}`);
    } catch (error) {
      logger.error(`Failed to sync guild ${guild.name}:`, error);
    }
  }
  logger.celebrate(`Sync complete: ${totalGuilds} guilds`);
}

/**
 * 处理 Bot 加入新服务器
 */
export async function handleGuildCreate(guild: DiscordGuild): Promise<void> {
  try {
    logger.newGuild(`Bot joined new guild: ${guild.name} (${guild.id})`);
    await Guild.create({
      guildId: guild.id,
      ownerId: guild.ownerId,
      apiEnabled: true,
      joinedAt: new Date()
    });
    logger.success(`Guild setup complete: ${guild.name}`);
  } catch (error) {
    logger.error(`Error setting up new guild ${guild.name}:`, error);
  }
}

/**
 * 同步指定角色的成员数据
 */
export async function syncRoleMembers(guild: DiscordGuild, roleIds: string[]): Promise<number> {
  try {
    const members = await getMembersWithRoles(guild, roleIds);
    if (members.length === 0) return 0;
    await bulkUpsertDiscordUsers(members, guild.id);
    await Guild.updateOne({ guildId: guild.id }, { lastSyncAt: new Date() });
    logger.success(`Synced ${members.length} members in ${guild.name}`);
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
    const [guildResult, usersResult, bindingsResult] = await Promise.all([
      Guild.deleteOne({ guildId: guild.id }),
      User.deleteMany({ guildId: guild.id }),
      VRChatBinding.deleteMany({ guildId: guild.id })
    ]);
    logger.delete(`Deleted data for ${guild.id}`);
  } catch (error) {
    logger.error(`Error deleting guild data:`, error);
  }
}
