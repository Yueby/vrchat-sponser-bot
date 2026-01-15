// /server stats 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { client } from '../../bot';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import DiscordUser from '../../models/DiscordUser';
import Guild from '../../models/Guild';
import VRChatBinding from '../../models/VRChatBinding';
import { handleCommandError, requireGuild } from '../../utils/errors';

export async function handleServerStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  // 权限检查：仅服务器所有者和管理员
  const member = interaction.guild!.members.cache.get(interaction.user.id);
  if (!member?.permissions.has(PermissionFlagsBits.Administrator) && interaction.guild!.ownerId !== interaction.user.id) {
    await interaction.reply({ content: '❌ Only server administrators can use this command!', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const guild = await Guild.findOne({ guildId });
    const guildInfo = client.guilds.cache.get(guildId);

    if (!guild || !guildInfo) {
      await interaction.editReply('❌ Guild not found in database');
      return;
    }

    // 实时计算统计数据
    const memberCount = await DiscordUser.countDocuments({ guildId });
    const bindingCount = await VRChatBinding.countDocuments({ guildId });
    const bindingRate = memberCount > 0 ? ((bindingCount / memberCount) * 100).toFixed(1) : '0';

    // 计算 Bot 运行时间
    const botJoinedDays = Math.floor((Date.now() - guild.joinedAt.getTime()) / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: `${guildInfo.name}`,
        iconURL: guildInfo.iconURL() || undefined
      })
      .setTitle('Server Statistics')
      .setDescription(
        `**Owner:** <@${guild.ownerId}>\n` +
        `**Bot Active:** ${botJoinedDays} days`
      )
      .setColor(guild.apiEnabled ? EMBED_COLORS.SUCCESS : EMBED_COLORS.INFO)
      .setThumbnail(guildInfo.iconURL({ size: AVATAR_SIZES.LARGE }) || null)
      .addFields(
        { 
          name: 'Database Statistics', 
          value: 
            `**Members:** ${memberCount}\n` +
            `**Bindings:** ${bindingCount}\n` +
            `**Bind Rate:** ${bindingRate}%`,
          inline: true 
        },
        { 
          name: 'API Status', 
          value: guild.apiEnabled ? '**Enabled**' : '**Disabled**',
          inline: true 
        },
        { 
          name: 'Activity Timeline', 
          value: 
            `**Last Sync:** ${guild.lastSyncAt ? `<t:${Math.floor(guild.lastSyncAt.getTime() / 1000)}:R>` : 'Never'}\n` +
            `**Last API Call:** ${guild.lastApiCallAt ? `<t:${Math.floor(guild.lastApiCallAt.getTime() / 1000)}:R>` : 'Never'}\n` +
            `**Bot Joined:** <t:${Math.floor(guild.joinedAt.getTime() / 1000)}:D>`,
          inline: false 
        }
      )
      .setFooter({ 
        text: `Requested by ${interaction.user.username} • Server ID: ${guildId}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
