import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import User from '../../models/User';
import VRChatBinding from '../../models/VRChatBinding';
import { EMBED_COLORS } from '../../config/constants';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';
import { generateRandomId, parseRoles, validateRoles } from '../../utils/external';
import { logger } from '../../utils/logger';
import { sanitizeVRChatName, validateVRChatName } from '../../utils/validation';

/**
 * /admin user add - 智能添加赞助者
 */
async function handleUserAdd(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const serverMember = interaction.options.getUser('server_member');
  const externalName = interaction.options.getString('external_name');
  const vrchatName = interaction.options.getString('vrchat_name', true);
  const rolesString = interaction.options.getString('roles', true);
  const notes = interaction.options.getString('notes');

  if (!serverMember && !externalName) {
    await interaction.editReply('🔴 Please provide either a `server_member` or an `external_name`.');
    return;
  }

  const userId = serverMember ? serverMember.id : generateRandomId();
  const displayName = serverMember ? serverMember.username : (externalName || vrchatName);

  const existing = await User.findOne({ userId, guildId });
  if (existing) {
    await interaction.editReply(`🔴 User already exists with ID \`${userId}\`.`);
    return;
  }

  const roleNames = parseRoles(rolesString);
  // 🚀 修复：确保 notes 为 undefined 而非 null，并显式断言 userType
  const newUser = await User.create({
    guildId,
    userId,
    userType: 'manual' as const,
    displayName,
    roles: roleNames,
    notes: notes || undefined,
    addedBy: interaction.user.id,
    joinedAt: new Date(),
    updatedAt: new Date()
  });

  const cleanVrcName = sanitizeVRChatName(vrchatName);
  await VRChatBinding.create({
    userId,
    guildId,
    vrchatName: cleanVrcName,
    firstBindTime: newUser.joinedAt,
    bindTime: newUser.joinedAt
  });

  const embed = new EmbedBuilder()
    .setTitle('Manual User Added')
    .setDescription(`Successfully added **${displayName}** as a sponsor.`)
    .addFields(
      { name: 'User ID', value: `\`${userId}\``, inline: true },
      { name: 'VRChat Name', value: cleanVrcName, inline: true },
      { name: 'Source', value: serverMember ? 'Server Member' : 'External', inline: true }
    )
    .setColor(EMBED_COLORS.SUCCESS)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`Admin ${interaction.user.username} manually added user ${userId} (${cleanVrcName})`);
}

/**
 * /admin user list - 列出所有用户
 */
async function handleUserList(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const typeFilter = interaction.options.getString('type');
  const query: any = { guildId };
  if (typeFilter) query.userType = typeFilter;

  const users = await User.find(query).sort({ joinedAt: -1 }).limit(20);

  if (users.length === 0) {
    await interaction.editReply('🔴 No users found.');
    return;
  }

  const list = users.map(u => `• **${u.displayName || u.userId}** (\`${u.userId}\`)\n  Type: ${u.userType} | Roles: ${u.roles.join(', ')}`).join('\n\n');

  const embed = new EmbedBuilder()
    .setTitle('User Management List')
    .setDescription(list)
    .setColor(EMBED_COLORS.INFO);

  await interaction.editReply({ embeds: [embed] });
}

/**
 * /admin user remove - 删除用户
 */
async function handleUserRemove(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const userId = interaction.options.getString('user_id', true);
  
  const result = await User.findOneAndDelete({ userId, guildId });
  if (!result) {
    await interaction.editReply(`🔴 User with ID \`${userId}\` not found.`);
    return;
  }

  await VRChatBinding.deleteOne({ userId, guildId });

  await interaction.editReply(`✅ Successfully removed user **${result.displayName || userId}**.`);
  logger.info(`Admin ${interaction.user.username} removed user ${userId}`);
}

/**
 * /admin user update - 更新现有用户信息
 */
async function handleUserUpdate(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const userId = interaction.options.getString('user_id', true);
  const newVrchatName = interaction.options.getString('vrchat_name');
  const rolesString = interaction.options.getString('roles');
  const externalName = interaction.options.getString('external_name');
  const notes = interaction.options.getString('notes');

  const user = await User.findOne({ userId, guildId });
  if (!user) {
    await interaction.editReply(`🔴 User with ID \`${userId}\` not found.`);
    return;
  }

  const updates: any = { updatedAt: new Date() };
  const bindUpdates: any = { bindTime: new Date() };
  const auditLogs = [];

  if (rolesString) {
    updates.roles = parseRoles(rolesString);
    auditLogs.push(`Roles: **${updates.roles.join(', ')}**`);
  }

  if (externalName) {
    updates.displayName = externalName;
    auditLogs.push(`Display Name: **${externalName}**`);
  }

  if (notes !== null) {
    updates.notes = notes || undefined;
    auditLogs.push(`Notes: **${notes || 'Cleared'}**`);
  }

  if (newVrchatName) {
    const cleanName = sanitizeVRChatName(newVrchatName);
    const validation = validateVRChatName(cleanName);
    if (!validation.valid) {
      await interaction.editReply(`🔴 ${validation.error}`);
      return;
    }
    
    // 更新绑定
    const existingBinding = await VRChatBinding.findOne({ userId, guildId });
    if (existingBinding) {
      if (existingBinding.vrchatName !== cleanName) {
        bindUpdates.vrchatName = cleanName;
        bindUpdates.$push = { nameHistory: { name: existingBinding.vrchatName, changedAt: new Date() } };
      }
    } else {
      await VRChatBinding.create({ userId, guildId, vrchatName: cleanName, firstBindTime: new Date(), bindTime: new Date() });
    }
    auditLogs.push(`VRChat Name: **${cleanName}**`);
  }

  await User.updateOne({ userId, guildId }, { $set: updates });
  if (bindUpdates.vrchatName || bindUpdates.$push) {
    await VRChatBinding.updateOne({ userId, guildId }, bindUpdates);
  }

  const embed = new EmbedBuilder()
    .setTitle('User Updated')
    .setDescription(`Successfully updated settings for **${user.displayName || userId}**.`)
    .addFields({ name: 'Changes', value: auditLogs.length > 0 ? auditLogs.join('\n') : 'No changes' })
    .setColor(EMBED_COLORS.SUCCESS)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`Admin ${interaction.user.username} updated user ${userId}`);
}

/**
 * 路由器
 */
export async function handleAdminUserCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!requireAdmin(interaction)) return;

  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    switch (subcommand) {
      case 'add': await handleUserAdd(interaction, guildId); break;
      case 'update': await handleUserUpdate(interaction, guildId); break;
      case 'list': await handleUserList(interaction, guildId); break;
      case 'remove': await handleUserRemove(interaction, guildId); break;
      default: await interaction.editReply('🔴 Unknown subcommand.');
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
