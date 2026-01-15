// /admin unbind 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import VRChatBinding from '../../models/VRChatBinding';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';
import { logger } from '../../utils/logger';

export async function handleAdminUnbind(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  // 权限检查：仅管理员
  if (!requireAdmin(interaction)) return;

  const targetUser = interaction.options.getUser('user', true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await VRChatBinding.findOneAndDelete({
      discordUserId: targetUser.id,
      guildId
    });

    if (result) {
      // 计算绑定时长
      const bindDays = Math.floor((Date.now() - result.firstBindTime.getTime()) / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Admin Action: Unbind User',
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTitle('Unbind Successful')
        .setDescription(
          `The VRChat binding for **${targetUser.username}** has been removed.`
        )
        .setColor(EMBED_COLORS.ERROR)
        .setThumbnail(targetUser.displayAvatarURL({ size: AVATAR_SIZES.MEDIUM }))
        .addFields(
          {
            name: 'Target User',
            value: `Discord: ${targetUser.username}\nID: \`${targetUser.id}\``,
            inline: true
          },
          {
            name: 'VRChat Info',
            value: `Name: ${result.vrchatName}\nBound Days: ${bindDays} days`,
            inline: true
          },
          {
            name: 'Binding History',
            value:
              `First Bound: <t:${Math.floor(result.firstBindTime.getTime() / 1000)}:D>\n` +
              `Last Update: <t:${Math.floor(result.bindTime.getTime() / 1000)}:R>`,
            inline: false
          }
        )
        .setFooter({
          text: `Performed by ${interaction.user.username} • ${interaction.guild!.name}`,
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      logger.info(`Admin ${interaction.user.username} unbound ${targetUser.username} in ${interaction.guild!.name}`);
    } else {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Admin Action: Check Binding',
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTitle('No Binding Found')
        .setDescription(
          `User **${targetUser.username}** has no VRChat binding in this server.`
        )
        .setColor(EMBED_COLORS.INFO)
        .setThumbnail(targetUser.displayAvatarURL({ size: AVATAR_SIZES.MEDIUM }))
        .addFields({
          name: 'Tip',
          value: 'Users must use `/changename` to create a VRChat binding first.',
          inline: false
        })
        .setFooter({
          text: `Checked by ${interaction.user.username} • ${interaction.guild!.name}`,
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
