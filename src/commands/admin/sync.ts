// /admin sync 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import Guild from '../../models/Guild';
import { bulkUpsertDiscordUsers } from '../../utils/database';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';
import { logger } from '../../utils/logger';

export async function handleAdminSync(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  // 权限检查：仅管理员
  if (!requireAdmin(interaction)) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const startTime = Date.now();

    // 更新 Guild 的 lastSyncAt
    await Guild.updateOne(
      { guildId },
      { lastSyncAt: new Date() }
    );

    // 同步所有成员（使用批量操作提升性能）
    await interaction.guild!.members.fetch();
    const members = Array.from(interaction.guild!.members.cache.values());
    const { upsertedCount, modifiedCount } = await bulkUpsertDiscordUsers(members, guildId);
    const syncCount = upsertedCount + modifiedCount;

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const timestamp = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Admin Action: Manual Sync',
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTitle('Database Sync Complete')
      .setDescription(
        `Successfully synchronized all member data with the database.`
      )
      .setColor(EMBED_COLORS.SUCCESS)
      .setThumbnail(interaction.guild!.iconURL({ size: AVATAR_SIZES.MEDIUM }) || null)
      .addFields(
        {
          name: 'Sync Statistics',
          value:
            `Total Synced: ${syncCount} members\n` +
            `New Records: ${upsertedCount}\n` +
            `Updated Records: ${modifiedCount}`,
          inline: true
        },
        {
          name: 'Performance',
          value:
            `Duration: ${elapsedTime}s\n` +
            `Completed: <t:${timestamp}:R>`,
          inline: true
        },
        {
          name: 'What Was Synced',
          value:
            '• Discord user IDs\n' +
            '• Role assignments\n' +
            '• Booster status\n' +
            '• Join dates',
          inline: false
        }
      )
      .setFooter({
        text: `Performed by ${interaction.user.username} • ${interaction.guild!.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info(`Manual sync completed for ${interaction.guild!.name}: ${syncCount} members in ${elapsedTime}s`);
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
