// /server roles 命令处理 - 配置管理的角色
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import { syncRoleMembers } from '../../handlers/guildEvents';
import Guild from '../../models/Guild';
import { calculateBindingProgress } from '../../utils/binding';
import { handleCommandError, requireGuild, requireOwner } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * 格式化角色名称列表用于显示
 */
function formatManagedRoles(
  guild: InstanceType<typeof Guild>,
  discordGuild: { roles: { cache: { get: (id: string) => { name: string } | undefined } } }
): string {
  if (guild.managedRoleIds.length === 0) {
    return 'None (not configured)';
  }
  
  return guild.managedRoleIds
    .map(id => {
      const role = discordGuild.roles.cache.get(id);
      return role ? `• ${role.name}` : `• Unknown Role (${id})`;
    })
    .join('\n');
}

export async function handleServerRoles(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  // 验证服务器所有者权限
  const hasPermission = await requireOwner(interaction);
  if (!hasPermission) return;

  const subcommand = interaction.options.getSubcommand();

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild) {
      await interaction.editReply('🔴 Guild configuration not found. Please try again later.');
      return;
    }

    switch (subcommand) {
      case 'add':
        await handleAddRole(interaction, guild);
        break;
      case 'remove':
        await handleRemoveRole(interaction, guild);
        break;
      case 'list':
        await handleListRoles(interaction, guild);
        break;
      case 'clear':
        await handleClearRoles(interaction, guild);
        break;
      default:
        await interaction.editReply('🔴 Unknown subcommand.');
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 添加管理的角色
 */
async function handleAddRole(
  interaction: ChatInputCommandInteraction,
  guild: InstanceType<typeof Guild>
): Promise<void> {
  const role = interaction.options.getRole('role', true);
  const guildId = interaction.guildId!;

  // 检查角色是否已存在
  if (guild.managedRoleIds.includes(role.id)) {
    await interaction.editReply(`🔴 Role ${role.name} is already in the managed roles list.`);
    return;
  }

  // 添加角色到管理列表
  guild.managedRoleIds.push(role.id);
  await guild.save();

  logger.info(`Added managed role ${role.name} (${role.id}) to guild ${guildId}`);

  // 立即同步该角色的成员
  const discordGuild = interaction.guild!;
  const syncedCount = await syncRoleMembers(discordGuild, [role.id]);

  // 计算当前绑定进度
  const progress = await calculateBindingProgress(guildId);

  // 构建响应
  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'Server Action: Add Managed Role',
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTitle('Managed Role Added')
    .setDescription(`Successfully added role ${role.name} to the managed roles list.`)
    .setColor(EMBED_COLORS.SUCCESS)
    .addFields(
      { name: 'Role', value: role.name, inline: true },
      { name: 'Members Synced', value: syncedCount.toString(), inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'Current Managed Roles', value: formatManagedRoles(guild, interaction.guild!), inline: false },
      { name: 'Binding Progress', value: `${progress.bound}/${progress.total} (${progress.percentage}%)`, inline: false }
    )
    .setFooter({
      text: `Performed by ${interaction.user.username} • ${interaction.guild!.name}`,
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

/**
 * 移除管理的角色
 */
async function handleRemoveRole(
  interaction: ChatInputCommandInteraction,
  guild: InstanceType<typeof Guild>
): Promise<void> {
  const role = interaction.options.getRole('role', true);

  // 检查角色是否存在
  if (!guild.managedRoleIds.includes(role.id)) {
    await interaction.editReply(`🔴 Role ${role.name} is not in the managed roles list.`);
    return;
  }

  // 从管理列表中移除
  guild.managedRoleIds = guild.managedRoleIds.filter(id => id !== role.id);
  await guild.save();

  logger.info(`Removed managed role ${role.name} (${role.id}) from guild ${interaction.guildId}`);

  // 计算当前绑定进度
  const progress = await calculateBindingProgress(interaction.guildId!);

  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'Server Action: Remove Managed Role',
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTitle('Managed Role Removed')
    .setDescription(`Successfully removed role ${role.name} from the managed roles list.`)
    .setColor(EMBED_COLORS.SUCCESS)
    .addFields(
      { name: 'Role', value: role.name, inline: false },
      { name: 'Current Managed Roles', value: formatManagedRoles(guild, interaction.guild!), inline: false },
      { name: 'Binding Progress', value: guild.managedRoleIds.length > 0 
        ? `${progress.bound}/${progress.total} (${progress.percentage}%)` 
        : '0/0 (0%)', inline: false }
    )
    .setFooter({
      text: `Performed by ${interaction.user.username} • ${interaction.guild!.name}`,
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

/**
 * 列出当前管理的角色
 */
async function handleListRoles(
  interaction: ChatInputCommandInteraction,
  guild: InstanceType<typeof Guild>
): Promise<void> {
  try {
    const progress = await calculateBindingProgress(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: interaction.guild!.name,
        iconURL: interaction.guild!.iconURL() || undefined
      })
      .setTitle('Managed Roles Configuration')
      .setColor(EMBED_COLORS.INFO)
      .setDescription(
        guild.managedRoleIds.length === 0
          ? 'No managed roles configured. Use /server roles add to add roles to track.'
          : `Total: ${guild.managedRoleIds.length} role${guild.managedRoleIds.length !== 1 ? 's' : ''}`
      );

    if (guild.managedRoleIds.length > 0) {
      embed.addFields(
        {
          name: 'Roles List',
          value: formatManagedRoles(guild, interaction.guild!),
          inline: false
        },
        {
          name: 'Binding Progress',
          value: `${progress.bound}/${progress.total} (${progress.percentage}%)`,
          inline: false
        }
      );
    }

    embed.setFooter({
      text: `Requested by ${interaction.user.username}`,
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 清除所有管理的角色
 */
async function handleClearRoles(
  interaction: ChatInputCommandInteraction,
  guild: InstanceType<typeof Guild>
): Promise<void> {
  if (guild.managedRoleIds.length === 0) {
    await interaction.editReply('🔴 No managed roles configured.');
    return;
  }

  const removedRoles = guild.managedRoleIds.map(id => {
    const role = interaction.guild!.roles.cache.get(id);
    return role ? role.name : `Unknown Role (${id})`;
  });

  guild.managedRoleIds = [];
  await guild.save();

  logger.info(`Cleared all managed roles from guild ${interaction.guildId}`);

  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'Server Action: Clear Managed Roles',
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTitle('All Managed Roles Cleared')
    .setDescription('All managed roles have been removed. Members will not be able to use /changename until roles are configured again.')
    .setColor(EMBED_COLORS.SUCCESS)
    .addFields({
      name: 'Removed Roles',
      value: removedRoles.map(name => `• ${name}`).join('\n'),
      inline: false
    })
    .setFooter({
      text: `Performed by ${interaction.user.username} • ${interaction.guild!.name}`,
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
