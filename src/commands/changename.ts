// /changename 命令处理
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { COOLDOWNS, EMBED_COLORS } from '../config/constants';
import DiscordUser from '../models/DiscordUser';
import VRChatBinding from '../models/VRChatBinding';
import { getMemberRoleIds, getMemberRoleNames, isMemberBooster } from '../utils/discord';
import { handleCommandError, requireGuild } from '../utils/errors';
import { logger } from '../utils/logger';
import { sanitizeVRChatName, validateVRChatName } from '../utils/validation';

// 用户冷却时间系统（存储过期时间戳）
const userCooldowns = new Map<string, number>();

// 定期清理过期的冷却记录（每 10 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [userId, expireTime] of userCooldowns.entries()) {
    if (expireTime < now) {
      userCooldowns.delete(userId);
    }
  }
}, COOLDOWNS.CLEANUP_INTERVAL);

export async function handleChangeName(interaction: ChatInputCommandInteraction): Promise<void> {
  const newName = interaction.options.getString('name', true);
  const userId = interaction.user.id;
  const username = interaction.user.username;
  const guildId = requireGuild(interaction);

  if (!guildId) return;

  // 验证 VRChat 名称
  const validation = validateVRChatName(newName);
  if (!validation.valid) {
    await interaction.reply({
      content: `❌ ${validation.error}`,
      ephemeral: true
    });
    return;
  }

  // 检查用户冷却时间
  if (userCooldowns.has(userId)) {
    const expirationTime = userCooldowns.get(userId)!;
    if (Date.now() < expirationTime) {
      const timeLeft = Math.round((expirationTime - Date.now()) / 1000);
      await interaction.reply({
        content: `⏱️ Please wait **${timeLeft}** seconds before using this command again`,
        ephemeral: true
      });
      return;
    }
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // 清理和格式化 VRChat 名称
    const cleanName = sanitizeVRChatName(newName);

    // 获取成员信息
    const member = interaction.guild!.members.cache.get(userId);
    if (!member) {
      await interaction.editReply('❌ Could not find member information');
      return;
    }

    const roles = getMemberRoleIds(member);
    const roleNames = getMemberRoleNames(member);

    // 更新 DiscordUser（仅核心数据）
    await DiscordUser.findOneAndUpdate(
      { userId, guildId },
      {
        roles,
        isBooster: isMemberBooster(member),
        joinedAt: member.joinedAt || new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    );

    // 更新或创建 VRChat 绑定
    const existingBinding = await VRChatBinding.findOne({ discordUserId: userId, guildId });

    if (existingBinding) {
      await VRChatBinding.updateOne(
        { discordUserId: userId, guildId },
        { vrchatName: cleanName, bindTime: new Date() }
      );
    } else {
      await VRChatBinding.create({
        discordUserId: userId,
        guildId,
        vrchatName: cleanName,
        firstBindTime: new Date(),
        bindTime: new Date()
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const isNewBinding = !existingBinding;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: member.displayName,
        iconURL: interaction.user.displayAvatarURL({ size: 256 })
      })
      .setTitle(isNewBinding ? '✨ VRChat Binding Created' : '✅ VRChat Name Updated')
      .setDescription(
        isNewBinding
          ? `Your VRChat name has been **successfully bound** to your Discord account!`
          : `Your VRChat name has been **updated** successfully.`
      )
      .setColor(member.displayColor || EMBED_COLORS.SUCCESS)
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: '🎮 VRChat Information',
          value: `**Name:** ${cleanName}${isNewBinding ? '\n*First time binding*' : ''}`,
          inline: true
        },
        {
          name: '👤 Discord Information',
          value: `**User:** ${username}\n**ID:** \`${userId}\``,
          inline: true
        },
        {
          name: '🎭 Current Roles',
          value: roleNames.length > 0 ? roleNames.map(r => `• ${r}`).join('\n') : 'No roles',
          inline: false
        },
        {
          name: '💎 Membership Status',
          value: isMemberBooster(member) ? '✨ **Server Booster**' : '👤 **Member**',
          inline: true
        },
        {
          name: '⏰ Last Updated',
          value: `<t:${timestamp}:R>`,
          inline: true
        }
      )
      .setFooter({
        text: `${interaction.guild!.name} • Use /whoami to view full profile`,
        iconURL: interaction.guild!.iconURL({ size: 64 }) || undefined
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    // 设置用户冷却时间（存储过期时间戳）
    userCooldowns.set(userId, Date.now() + COOLDOWNS.CHANGENAME);
    
    logger.info(`User ${username} (${userId}) in ${interaction.guild!.name} ${isNewBinding ? 'bound' : 'changed'} name to ${cleanName}`);
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
