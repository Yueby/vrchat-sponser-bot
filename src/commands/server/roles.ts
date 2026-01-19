// /server roles 命令处理 - 配置管理的角色
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import { syncRoleMembers } from '../../handlers/guildEvents';
import Guild from '../../models/Guild';
import { calculateBindingProgress } from '../../utils/binding';
import { handleCommandError, requireGuild, requireOwner } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * 格式化角色名称列表
 */
function formatManagedRoles(guild: any, discordGuild: any): string {
  if (guild.managedRoleIds.length === 0) return 'None (not configured)';
  return guild.managedRoleIds.map((id: string) => {
    const role = discordGuild.roles.cache.get(id);
    return role ? `• ${role.name}` : `• Unknown Role (${id})`;
  }).join('\n');
}

/**
 * /server roles - 统筹管理角色配置
 */
export async function handleAdminRolesCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!await requireOwner(interaction)) return;

  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild) return;

    switch (subcommand) {
      case 'add': {
        const role = interaction.options.getRole('role', true);
        if (guild.managedRoleIds.includes(role.id)) {
          await interaction.editReply('🔴 Role already managed.');
          return;
        }
        guild.managedRoleIds.push(role.id);
        await guild.save();
        const syncedCount = await syncRoleMembers(interaction.guild!, [role.id]);
        const progress = await calculateBindingProgress(guildId);
        
        const embed = new EmbedBuilder()
          .setTitle('Role Added')
          .setColor(EMBED_COLORS.SUCCESS)
          .addFields(
            { name: 'Role', value: role.name, inline: true },
            { name: 'Synced', value: syncedCount.toString(), inline: true },
            { name: 'Progress', value: `${progress.bound}/${progress.total}`, inline: false }
          );
        await interaction.editReply({ embeds: [embed] });
        break;
      }
      case 'list': {
        const progress = await calculateBindingProgress(guildId);
        const embed = new EmbedBuilder()
          .setTitle('Managed Roles')
          .setDescription(formatManagedRoles(guild, interaction.guild))
          .addFields({ name: 'Progress', value: `${progress.bound}/${progress.total} (${progress.percentage}%)` })
          .setColor(EMBED_COLORS.INFO);
        await interaction.editReply({ embeds: [embed] });
        break;
      }
      case 'clear': {
        guild.managedRoleIds = [];
        await guild.save();
        await interaction.editReply('✅ Cleared all managed roles.');
        break;
      }
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
