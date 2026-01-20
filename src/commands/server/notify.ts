// /server notify 命令处理 - 配置通知目标用户
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ModalSubmitInteraction, RepliableInteraction } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import Guild from '../../models/Guild';
import { handleCommandError, requireGuild, requireOwner } from '../../utils/errors';
import { logger } from '../../utils/logger';

export async function handleServerNotify(
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
  userId?: string
): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  // 验证服务器所有者权限
  const hasPermission = await requireOwner(interaction);
  if (!hasPermission) return;

  // 如果传了 userId 则直接用，否则从交互选项中取
  const targetUserId = userId || (interaction.isChatInputCommand() ? interaction.options.getUser('user')?.id : null);
  
  if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  try {
    if (targetUserId) {
      const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
      if (!targetUser) {
        await interaction.editReply('🔴 Could not find the specified user.');
        return;
      }

      // 设置通知用户
      await Guild.updateOne(
        { guildId },
        { notifyUserId: targetUser.id }
      );

      // 发送测试通知
      const testEmbed = new EmbedBuilder()
        .setTitle('Notification Setup Complete')
        .setDescription(`You have been set as the changename notification recipient for ${interaction.guild!.name}`)
        .setColor(EMBED_COLORS.SUCCESS)
        .addFields({
          name: 'What You Will Receive',
          value: 'You will receive a DM notification whenever a member uses /changename to bind or update their VRChat name.',
          inline: false
        })
        .setTimestamp();

      try {
        await targetUser.send({ embeds: [testEmbed] });
        logger.info(`Set notify user to ${targetUser.tag} for guild ${guildId}`);

        const confirmEmbed = new EmbedBuilder()
          .setAuthor({
            name: 'Server Action: Set Notification Target',
            iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
          })
          .setTitle('Notification Target Configured')
          .setDescription(`Set ${targetUser.tag} as the notification recipient for changename events.`)
          .setColor(EMBED_COLORS.SUCCESS)
          .addFields({
            name: 'Test Notification',
            value: 'Successfully sent test notification to the user.',
            inline: false
          })
          .setFooter({
            text: `Configured by ${interaction.user.username} • ${interaction.guild!.name}`,
            iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });
      } catch (error) {
        // 无法发送私信
        await Guild.updateOne(
          { guildId },
          { $unset: { notifyUserId: '' } }
        );

        await interaction.editReply(
          '🔴 Cannot send DM to this user. Please check their privacy settings.\n' +
          'Tip: Users must allow direct messages from server members.'
        );
        return;
      }
    } else {
      // 清除配置
      const guild = await Guild.findOne({ guildId });
      if (!guild?.notifyUserId) {
        await interaction.editReply('🔴 No notification recipient configured.');
        return;
      }

      await Guild.updateOne(
        { guildId },
        { $unset: { notifyUserId: '' } }
      );

      logger.info(`Cleared notify user for guild ${guildId}`);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Server Action: Clear Notification',
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTitle('Notification Configuration Cleared')
        .setDescription('Changename notifications will no longer be sent.')
        .setColor(EMBED_COLORS.SUCCESS)
        .setFooter({
          text: `Performed by ${interaction.user.username} • ${interaction.guild!.name}`,
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
