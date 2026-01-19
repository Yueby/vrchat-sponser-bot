// /admin unbound 命令处理 - 查看未绑定的成员
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import { getUnboundMembers } from '../../utils/binding';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';

/**
 * /admin unbound - 查找未绑定赞助身份的服务器成员
 */
export async function handleAdminUnboundCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!requireAdmin(interaction)) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const unboundMembers = await getUnboundMembers(guildId);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Admin Action: Check Unbound Members',
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTitle('Unbound Members Report')
      .setColor(unboundMembers.length === 0 ? EMBED_COLORS.SUCCESS : EMBED_COLORS.WARNING)
      .setDescription(
        unboundMembers.length === 0 
          ? '✅ All members with managed roles have bound their VRChat names.' 
          : `⚠️ Found **${unboundMembers.length}** member${unboundMembers.length !== 1 ? 's' : ''} without VRChat bindings.`
      );

    if (unboundMembers.length > 0) {
      const list = unboundMembers
        .slice(0, 15)
        .map((m, i) => `${i + 1}. **${m.displayName}** (<@${m.userId}>)`)
        .join('\n');
      
      embed.addFields({
        name: 'Top Unbound Members',
        value: list,
        inline: false
      });
      
      if (unboundMembers.length > 15) {
        embed.setFooter({ text: `Showing first 15 of ${unboundMembers.length}` });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
