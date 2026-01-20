// /server stats 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { client } from '../../bot';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import Guild from '../../models/Guild';
import User from '../../models/User';
import VRChatBinding from '../../models/VRChatBinding';
import { calculateBindingProgress } from '../../utils/binding';
import { handleCommandError, requireGuild } from '../../utils/errors';

/**
 * /server stats - 查看服务器概览统计
 */
export async function handleServerStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  const member = interaction.guild!.members.cache.get(interaction.user.id);
  if (!member?.permissions.has(PermissionFlagsBits.Administrator) && interaction.guild!.ownerId !== interaction.user.id) {
    await interaction.reply({ content: '🔴 Only server administrators can use this command!', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const guild = await Guild.findOne({ guildId });
    const guildInfo = client.guilds.cache.get(guildId);

    if (!guild || !guildInfo) {
      await interaction.editReply('🔴 Guild not found in database');
      return;
    }

    const hasManagedRoles = guild.managedRoleIds?.length > 0;
    const progress = hasManagedRoles ? await calculateBindingProgress(guildId) : { bound: 0, total: 0, percentage: 0 };

    // 统合后的统计查询
    const totalUsers = await User.countDocuments({ guildId });
    const discordUserCount = await User.countDocuments({ guildId, userType: 'discord' });
    const manualUserCount = await User.countDocuments({ guildId, userType: 'manual' });
    const bindingCount = await VRChatBinding.countDocuments({ guildId });

    const embed = new EmbedBuilder()
      .setAuthor({ name: guildInfo.name, iconURL: guildInfo.iconURL() || undefined })
      .setTitle('Server Statistics')
      .setColor(guild.apiEnabled ? EMBED_COLORS.SUCCESS : EMBED_COLORS.INFO)
      .setThumbnail(guildInfo.iconURL({ size: AVATAR_SIZES.LARGE }))
      .addFields(
        { 
          name: 'Core Metrics', 
          value: `Total Registered: **${totalUsers}**\nDiscord Members: ${discordUserCount}\nManual Sponsors: ${manualUserCount}`,
          inline: true 
        },
        { 
          name: 'VRChat Bindings', 
          value: `Bound Count: **${bindingCount}**\nCompletion: ${progress.percentage}%`,
          inline: true 
        },
        { 
          name: 'API Status', 
          value: guild.apiEnabled ? '🟢 Enabled' : '🔴 Disabled',
          inline: true 
        },
        { 
          name: 'Timeline', 
          value: `Joined: <t:${Math.floor(guild.joinedAt.getTime() / 1000)}:D>\nLast Sync: ${guild.lastSyncAt ? `<t:${Math.floor(guild.lastSyncAt.getTime() / 1000)}:R>` : 'Never'}`,
          inline: false 
        },
        {
          name: '🔗 Dashboard',
          value: `[View Online Dashboard](http://${process.env.DOMAIN || 'localhost'}/dashboard/${guildId})`,
          inline: false
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
