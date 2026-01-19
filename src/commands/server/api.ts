// /server api 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { EMBED_COLORS } from '../../config/constants';
import Guild from '../../models/Guild';
import { handleCommandError, requireGuild, requireOwner } from '../../utils/errors';

/**
 * /server api - 统筹管理 Web API 访问配置
 */
export async function handleAdminApiCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!await requireOwner(interaction)) return;

  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild) return;

    if (subcommand === 'toggle') {
      const newState = !guild.apiEnabled;
      guild.apiEnabled = newState;
      await guild.save();
      
      await interaction.editReply(`✅ API access is now **${newState ? 'ENABLED' : 'DISABLED'}**.`);
    } else if (subcommand === 'status') {
      const embed = new EmbedBuilder()
        .setTitle('Web API Status')
        .setColor(guild.apiEnabled ? EMBED_COLORS.SUCCESS : EMBED_COLORS.ERROR)
        .addFields(
          { name: 'Access', value: guild.apiEnabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
          { name: 'Endpoint', value: `\`http://${process.env.DOMAIN || 'localhost'}/api/vrchat/sponsors/${guildId}\``, inline: false },
          { name: 'Dashboard', value: `[View Online](http://${process.env.DOMAIN || 'localhost'}/dashboard/${guildId})`, inline: false }
        );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
