import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ButtonInteraction, ModalSubmitInteraction, RepliableInteraction } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import Guild from '../../models/Guild';
import { getMembersWithRoles } from '../../utils/binding';
import { bulkUpsertDiscordUsers } from '../../utils/database';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * 路由器
 */
export async function handleAdminSyncCommand(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  action?: 'now' | 'status'
): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;
  if (!requireAdmin(interaction)) return;

  const subcommand = action || (interaction.isChatInputCommand() ? interaction.options.getSubcommand() : null);
  
  if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  try {
    switch (subcommand) {
      case 'now': await handleSyncNow(interaction, guildId); break;
      case 'status': await handleSyncStatus(interaction, guildId); break;
      default: 
        if (interaction.isRepliable()) {
          await interaction.editReply('🔴 Unknown action.');
        }
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 立即执行同步
 */
async function handleSyncNow(interaction: RepliableInteraction, guildId: string): Promise<void> {
  const startTime = Date.now();
  const guild = await Guild.findOne({ guildId });
  if (!guild || guild.managedRoleIds.length === 0) {
    await interaction.editReply('🔴 No managed roles configured. Use `/server roles add` first.');
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
  logger.info(`Admin ${interaction.user.username} triggered manual sync in ${interaction.guild!.name}`);
}

/**
 * 查看同步状态
 */
async function handleSyncStatus(interaction: RepliableInteraction, guildId: string): Promise<void> {
  const guild = await Guild.findOne({ guildId });
  const embed = new EmbedBuilder()
    .setTitle('Sync Status')
    .setColor(EMBED_COLORS.INFO)
    .addFields(
      { name: 'Managed Roles', value: guild?.managedRoleIds.length ? `${guild.managedRoleIds.length} roles` : 'None', inline: true },
      { name: 'Last Sync', value: guild?.lastSyncAt ? `<t:${Math.floor(guild.lastSyncAt.getTime() / 1000)}:R>` : 'Never', inline: true }
    );
  await interaction.editReply({ embeds: [embed] });
}
