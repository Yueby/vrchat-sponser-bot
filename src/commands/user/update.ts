import { ChatInputCommandInteraction, ModalSubmitInteraction, ButtonInteraction } from 'discord.js';
import User from '../../models/User';
import VRChatBinding from '../../models/VRChatBinding';
import { getMemberRoleIds, isMemberBooster } from '../../utils/discord';
import { sanitizeVRChatName, validateVRChatName } from '../../utils/validation';
import { logger } from '../../utils/logger';

/**
 * 更新用户资料逻辑
 */
export async function handleUserUpdate(
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction | ButtonInteraction, 
  guildId: string,
  vrchatName?: string,
  avatarUrl?: string
): Promise<void> {
  // 如果是斜杠命令，从 options 中获取参数
  const newVrchatName = vrchatName || (interaction.isChatInputCommand() ? interaction.options.getString('vrchat_name') : null);
  const newAvatarUrl = avatarUrl || (interaction.isChatInputCommand() ? interaction.options.getString('avatar_url') : null);
  const userId = interaction.user.id;
  
  if (!newVrchatName && !newAvatarUrl) {
    const errorMsg = '🔴 Please provide at least one option to update.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMsg);
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
    return;
  }

  // 统一确保 deferReply
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const member = interaction.guild!.members.cache.get(userId);
  if (!member) {
    await interaction.editReply('🔴 Could not find member information.');
    return;
  }

  // 1. 确保核心 User 存在
  const user = await User.findOneAndUpdate(
    { userId, guildId },
    { 
      $set: { 
        updatedAt: new Date(),
        roles: getMemberRoleIds(member),
        isBooster: isMemberBooster(member),
        joinedAt: member.joinedAt || new Date()
      },
      $setOnInsert: { userType: 'discord' }
    },
    { upsert: true, new: true }
  );

  let responseMsg = '✅ Successfully updated ';
  const updates = [];

  // 2. 处理 VRChat 名称更新
  if (newVrchatName) {
    const validation = validateVRChatName(newVrchatName);
    if (!validation.valid) {
      await interaction.editReply(`🔴 ${validation.error}`);
      return;
    }
    const cleanName = sanitizeVRChatName(newVrchatName);
    
    const existingBinding = await VRChatBinding.findOne({ userId, guildId });
    if (existingBinding) {
      const bindUpdate: any = { vrchatName: cleanName, bindTime: new Date() };
      if (existingBinding.vrchatName !== cleanName) {
        bindUpdate.$push = { nameHistory: { name: existingBinding.vrchatName, changedAt: new Date() } };
      }
      await VRChatBinding.updateOne({ userId, guildId }, bindUpdate);
    } else {
      await VRChatBinding.create({
        userId, guildId, vrchatName: cleanName, firstBindTime: new Date(), bindTime: new Date()
      });
    }
    updates.push(`VRChat name to **${cleanName}**`);
  }

  // 3. 处理头像更新
  if (newAvatarUrl) {
    if (!/^https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)(?:\?.*)?$/i.test(newAvatarUrl)) {
      await interaction.editReply('🔴 Invalid avatar URL format.');
      return;
    }
    await User.updateOne({ userId, guildId }, { $set: { avatarUrl: newAvatarUrl } });
    updates.push('custom avatar');
  }

  await interaction.editReply(`${responseMsg} ${updates.join(' and ')}.`);

  // 4. 发送管理员通知 (仅当 VRChat 名字变动时)
  if (newVrchatName) {
    try {
      const Guild = (await import('../../models/Guild')).default;
      const guildData = await Guild.findOne({ guildId });
      
      if (guildData?.notifyUserId) {
        const notifyUser = await interaction.client.users.fetch(guildData.notifyUserId).catch(() => null);
        if (notifyUser) {
          const { EmbedBuilder } = await import('discord.js');
          const { EMBED_COLORS, AVATAR_SIZES } = await import('../../config/constants');
          
          const embed = new EmbedBuilder()
            .setTitle('🔔 VRChat Name Update')
            .setDescription(`User **${interaction.user.tag}** has updated their VRChat name in **${interaction.guild?.name}**.`)
            .setColor(EMBED_COLORS.INFO)
            .setThumbnail(interaction.user.displayAvatarURL({ size: AVATAR_SIZES.MEDIUM }))
            .addFields(
              { name: 'Discord User', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)`, inline: true },
              { name: 'New VRChat Name', value: sanitizeVRChatName(newVrchatName), inline: true }
            )
            .setTimestamp();

          await notifyUser.send({ embeds: [embed] }).catch(() => {
            logger.warn(`Failed to send DM notification to ${guildData.notifyUserId}`);
          });
        }
      }
    } catch (error) {
      logger.error('Error sending update notification:', error);
    }
  }
}
