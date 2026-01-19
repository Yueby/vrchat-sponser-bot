// /server sync 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import Guild from '../../models/Guild';
import { getMembersWithRoles } from '../../utils/binding';
import { bulkUpsertDiscordUsers } from '../../utils/database';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * /server sync - 手动同步服务器成员数据
 */
export async function handleAdminSyncCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!requireAdmin(interaction)) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const startTime = Date.now();
    const guild = await Guild.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) {
      await interaction.editReply('🔴 No managed roles configured.');
      return;
    }

    const members = await getMembersWithRoles(interaction.guild!, guild.managedRoleIds);
    if (members.length === 0) {
      await interaction.editReply('🔴 No members found with managed roles.');
      return;
    }

    const { upsertedCount, modifiedCount } = await bulkUpsertDiscordUsers(members, guildId);
    await Guild.updateOne({ guildId }, { lastSyncAt: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('Sync Complete')
      .setColor(EMBED_COLORS.SUCCESS)
      .addFields(
        { name: 'Stats', value: `Total: ${upsertedCount + modifiedCount}\nNew: ${upsertedCount}\nUpdated: ${modifiedCount}`, inline: true },
        { name: 'Duration', value: `${((Date.now() - startTime) / 1000).toFixed(2)}s`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
