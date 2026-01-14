// 成员事件处理器
import { GuildMember, PartialGuildMember } from 'discord.js';
import DiscordUser from '../models/DiscordUser';
import Guild from '../models/Guild';
import VRChatBinding from '../models/VRChatBinding';
import { getMemberRoleIds, isMemberBooster } from '../utils/discord';
import { logger } from '../utils/logger';

/**
 * 处理成员加入服务器
 */
export async function handleMemberAdd(member: GuildMember): Promise<void> {
  try {
    if (member.user.bot) return;
    
    // 确保 Guild 记录存在（防止 Bot 重启后数据丢失）
    await Guild.findOneAndUpdate(
      { guildId: member.guild.id },
      { ownerId: member.guild.ownerId },
      { upsert: true, setDefaultsOnInsert: true }
    );
    
    // 创建或更新成员记录（使用 upsert 避免重复加入时出错）
    await DiscordUser.findOneAndUpdate(
      { userId: member.id, guildId: member.guild.id },
      {
        roles: getMemberRoleIds(member),
        isBooster: isMemberBooster(member),
        joinedAt: member.joinedAt || new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    );
    
    logger.memberJoin(`New member: ${member.user.username} joined ${member.guild.name}`);
  } catch (error) {
    logger.error('Error adding new member:', error);
  }
}

/**
 * 处理成员离开服务器
 */
export async function handleMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
  try {
    const userId = member.id;
    const guildId = member.guild.id;
    const username = member.user?.username || 'Unknown User';

    // 删除该用户在该服务器的数据
    const [discordUserResult, vrchatBindingResult] = await Promise.all([
      DiscordUser.findOneAndDelete({ userId, guildId }),
      VRChatBinding.findOneAndDelete({ discordUserId: userId, guildId })
    ]);

    if (discordUserResult || vrchatBindingResult) {
      logger.memberLeave(`User left ${member.guild.name}: ${username} (${userId}). Data deleted.`);
    }
  } catch (error) {
    logger.error('Error deleting user on leave:', error);
  }
}
