// /server api 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import Guild from '../../models/Guild';
import { handleCommandError, requireGuild, requireOwner } from '../../utils/errors';
import { logger } from '../../utils/logger';

export async function handleServerApi(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  // 权限检查：仅服务器所有者
  if (!requireOwner(interaction)) return;

  const enabled = interaction.options.getBoolean('enabled', true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await Guild.updateOne(
      { guildId },
      { apiEnabled: enabled },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setAuthor({
        name: interaction.guild!.name,
        iconURL: interaction.guild!.iconURL() || undefined
      })
      .setTitle(enabled ? 'API Access Enabled' : 'API Access Disabled')
      .setDescription(
        enabled
          ? 'The VRChat API endpoint is now **accessible**.\nVRChat worlds can now fetch sponsor data from this server.'
          : 'The VRChat API endpoint has been **disabled**.\nNo external access is allowed until re-enabled.'
      )
      .setColor(enabled ? EMBED_COLORS.SUCCESS : EMBED_COLORS.ERROR)
      .addFields(
        {
          name: 'API Endpoint',
          value: `\`\`\`\n/api/vrchat/sponsors/${guildId}\n\`\`\``,
          inline: false
        },
        {
          name: 'Status',
          value: enabled ? 'Active' : 'Inactive',
          inline: true
        },
        {
          name: 'Access Control',
          value: 'Only server owner can toggle',
          inline: true
        }
      )
      .setFooter({
        text: `Changed by ${interaction.user.username} • ${interaction.guild!.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTimestamp();

    if (enabled) {
      embed.addFields({
        name: 'How to Use',
        value:
          '1. Copy the API endpoint above\n' +
          '2. Use it in your VRChat Udon script\n' +
          '3. Parse the JSON response as DataDictionary',
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
    logger.info(`API access ${enabled ? 'enabled' : 'disabled'} for guild ${interaction.guild!.name}`);
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
