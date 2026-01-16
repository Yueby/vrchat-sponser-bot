// /admin sync 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import Guild from '../../models/Guild';
import { getMembersWithRoles } from '../../utils/binding';
import { bulkUpsertDiscordUsers } from '../../utils/database';
import { getMemberRoleIds, isMemberBooster } from '../../utils/discord';
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

    // 获取服务器配置
    const guild = await Guild.findOne({ guildId });
    if (!guild || guild.managedRoleIds.length === 0) {
      await interaction.editReply('🔴 No managed roles configured. Please use /server roles to configure roles first.');
      return;
    }

    // 获取拥有指定角色的成员
    const members = await getMembersWithRoles(interaction.guild!, guild.managedRoleIds);

    if (members.length === 0) {
      await interaction.editReply('🔴 No members found with managed roles.');
      return;
    }

    // 批量同步（使用批量操作提升性能）
    const { upsertedCount, modifiedCount } = await bulkUpsertDiscordUsers(members, guildId);
    const syncCount = upsertedCount + modifiedCount;

    // 更新 Guild 的 lastSyncAt
    await Guild.updateOne(
      { guildId },
      { lastSyncAt: new Date() }
    );

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const timestamp = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Admin Action: Manual Sync',
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTitle('Database Sync Complete')
      .setDescription(
        `Successfully synchronized member data for users with managed roles.`
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
