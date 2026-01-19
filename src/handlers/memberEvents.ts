// 成员事件处理器
import { GuildMember, PartialGuildMember } from 'discord.js';
import User from '../models/User';
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
    
    await Guild.findOneAndUpdate(
      { guildId: member.guild.id },
      { ownerId: member.guild.ownerId },
      { upsert: true, setDefaultsOnInsert: true }
    );
    
    await User.findOneAndUpdate(
      { userId: member.id, guildId: member.guild.id },
      {
        userType: 'discord',
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
 * 处理成员角色更新事件
 */
export async function handleMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember
): Promise<void> {
  const guildId = newMember.guild.id;
  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) return;
    
    const oldHasRole = oldMember.roles.cache.some(r => guild.managedRoleIds.includes(r.id));
    const newHasRole = newMember.roles.cache.some(r => guild.managedRoleIds.includes(r.id));
    
    if (oldHasRole === newHasRole) return;
    
    if (!newHasRole) {
      logger.memberLeave(`Member ${newMember.user.tag} lost managed role in ${newMember.guild.name}`);
      return;
    }
    
    await User.findOneAndUpdate(
      { userId: newMember.id, guildId },
      {
        userType: 'discord',
        roles: getMemberRoleIds(newMember),
        isBooster: isMemberBooster(newMember),
        joinedAt: newMember.joinedAt || new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    );
    logger.memberJoin(`Member ${newMember.user.tag} gained managed role in ${newMember.guild.name}`);
  } catch (error) {
    logger.error('Error handling member update:', error);
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

    const [userResult, bindingResult] = await Promise.all([
      User.findOneAndDelete({ userId, guildId }),
      VRChatBinding.findOneAndDelete({ userId, guildId })
    ]);

    if (userResult || bindingResult) {
      logger.memberLeave(`User left ${member.guild.name}: ${username} (${userId}). Data deleted.`);
    }
  } catch (error) {
    logger.error('Error deleting user on leave:', error);
  }
}
