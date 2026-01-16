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
 * 处理成员角色更新事件
 * 当成员获得/失去管理的角色时，自动同步该成员数据
 */
export async function handleMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember
): Promise<void> {
  const guildId = newMember.guild.id;
  
  try {
    // 获取服务器配置
    const guild = await Guild.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) return;
    
    // 检查是否涉及管理的角色
    const oldHasRole = oldMember.roles.cache.some(r => guild.managedRoleIds.includes(r.id));
    const newHasRole = newMember.roles.cache.some(r => guild.managedRoleIds.includes(r.id));
    
    // 角色状态没有变化，跳过
    if (oldHasRole === newHasRole) return;
    
    // 角色状态发生变化
    if (!newHasRole) {
      // 失去管理的角色 - 保留数据但标记
      logger.memberLeave(`Member ${newMember.user.tag} lost managed role in ${newMember.guild.name}`);
      return;
    }
    
    // 获得管理的角色 - 同步成员数据
    await DiscordUser.findOneAndUpdate(
      { userId: newMember.id, guildId },
      {
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
