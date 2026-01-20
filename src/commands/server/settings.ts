import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ButtonInteraction, Interaction, RepliableInteraction } from 'discord.js';
import Guild from '../../models/Guild';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';

/**
 * /server 指令 - 显示统一管理面板
 */
export async function handleServerSettings(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  statusMsg?: string
): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;
  if (!requireAdmin(interaction)) return;

  if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild) {
      await interaction.editReply('🔴 Guild settings not found.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Server Management Panel')
      .setDescription(statusMsg ? `${statusMsg}\n\nUnified interface for managing bot settings on this server.` : 'Unified interface for managing bot settings on this server.')
      .setColor(statusMsg?.includes('🔴') || statusMsg?.includes('error') ? EMBED_COLORS.ERROR : EMBED_COLORS.INFO)
      .addFields(
        { 
          name: '🚀 Synchronization', 
          value: `Status: ${guild.isSyncing ? '🟢 Syncing...' : '⚪ Idle'}\nLast Sync: ${guild.lastSyncAt ? `<t:${Math.floor(guild.lastSyncAt.getTime() / 1000)}:R>` : 'Never'}`,
          inline: true 
        },
        { 
          name: '📡 Web API', 
          value: `Status: ${guild.apiEnabled ? '🟢 Enabled' : '🔴 Disabled'}\nKey: ${guild.apiEnabled ? '`••••••••`' : 'N/A'}`,
          inline: true 
        },
        { 
          name: '🔔 Notifications', 
          value: `Notify User: ${guild.notifyUserId ? `<@${guild.notifyUserId}>` : 'None'}`,
          inline: false 
        },
        {
          name: '🔗 Dashboard',
          value: `[Open Management Dashboard](http://${process.env.DOMAIN || 'localhost'}/dashboard/${guildId})`,
          inline: false
        }
      )
      .setFooter({ text: 'Use buttons below to perform actions' })
      .setTimestamp();

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_server_sync_now')
        .setLabel('Sync Now')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_server_sync_status')
        .setLabel('Detailed Status')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_server_api_toggle')
        .setLabel(guild.apiEnabled ? 'Disable API' : 'Enable API')
        .setStyle(guild.apiEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_server_api_getkey')
        .setLabel('View API Key')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!guild.apiEnabled)
    );

    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_server_notify_edit')
        .setLabel('Set Notify User')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Secondary)
    );

    if (interaction.isRepliable()) {
      await interaction.editReply({ 
        embeds: [embed],
        components: [row1, row2, row3]
      });
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
