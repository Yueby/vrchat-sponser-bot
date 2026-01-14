// /external 命令处理器
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, DISCORD_LIMITS, EMBED_COLORS } from '../../config/constants';
import ExternalUser from '../../models/ExternalUser';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';
import {
    findExternalUser,
    parseRoles,
    validateDiscordUserId,
    validateRoles
} from '../../utils/external';
import { logger } from '../../utils/logger';
import { sanitizeVRChatName, validateVRChatName } from '../../utils/validation';

/**
 * /external add - 添加外部用户
 */
export async function handleExternalAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!requireAdmin(interaction)) return;

  const vrchatName = interaction.options.getString('vrchat_name', true);
  const rolesString = interaction.options.getString('roles', true);
  const discordUserId = interaction.options.getString('discord_user_id');
  const displayName = interaction.options.getString('display_name');
  const notes = interaction.options.getString('notes');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // 验证 VRChat 名称
    const cleanVrchatName = sanitizeVRChatName(vrchatName);
    const nameValidation = validateVRChatName(cleanVrchatName);
    if (!nameValidation.valid) {
      await interaction.editReply(`❌ ${nameValidation.error}`);
      return;
    }

    // 验证 Discord User ID（如果提供）
    if (discordUserId && !validateDiscordUserId(discordUserId)) {
      await interaction.editReply('❌ Invalid Discord User ID format. Must be 17-19 digits.');
      return;
    }

    // 解析和验证角色
    const roleNames = parseRoles(rolesString);
    const roleValidation = validateRoles(interaction.guild!, roleNames);
    if (!roleValidation.valid) {
      await interaction.editReply(`❌ ${roleValidation.error}`);
      return;
    }

    // 检查是否已存在
    const existing = await findExternalUser(guildId, cleanVrchatName);
    if (existing) {
      await interaction.editReply(`❌ External user with VRChat name **${cleanVrchatName}** already exists.`);
      return;
    }

    // 如果提供了 Discord ID，检查是否已被使用
    if (discordUserId) {
      const existingByDiscord = await ExternalUser.findOne({ guildId, discordUserId });
      if (existingByDiscord) {
        await interaction.editReply(`❌ External user with Discord ID **${discordUserId}** already exists.`);
        return;
      }
    }

    // 创建外部用户
    const externalUser = await ExternalUser.create({
      guildId,
      vrchatName: cleanVrchatName,
      discordUserId: discordUserId || undefined,
      virtualRoles: roleNames,
      displayName: displayName || undefined,
      addedBy: interaction.user.id,
      addedAt: new Date(),
      updatedAt: new Date(),
      notes: notes || undefined
    });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Admin Action: Add External User',
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTitle('✅ External User Added')
      .setDescription(`Successfully added external user **${cleanVrchatName}**`)
      .setColor(EMBED_COLORS.SUCCESS)
      .addFields(
        {
          name: '🎮 VRChat Information',
          value: `**Name:** ${cleanVrchatName}${displayName ? `\n**Display:** ${displayName}` : ''}`,
          inline: true
        },
        {
          name: '🎭 Assigned Roles',
          value: roleNames.map(r => `• ${r}`).join('\n'),
          inline: true
        }
      )
      .setFooter({
        text: `Added by ${interaction.user.username} • ${interaction.guild!.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTimestamp();

    if (discordUserId) {
      embed.addFields({
        name: '🔗 Discord Account',
        value: `<@${discordUserId}>`,
        inline: false
      });
    }

    if (notes) {
      embed.addFields({
        name: '📝 Notes',
        value: notes.substring(0, DISCORD_LIMITS.EMBED_FIELD_VALUE_MAX),
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
    logger.info(`External user ${cleanVrchatName} added to ${interaction.guild!.name} by ${interaction.user.username}`);
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * /external update - 更新外部用户
 */
export async function handleExternalUpdate(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!requireAdmin(interaction)) return;

  const identifier = interaction.options.getString('identifier', true);
  const newVrchatName = interaction.options.getString('vrchat_name', false);
  const newRolesString = interaction.options.getString('roles', false);
  const newDisplayName = interaction.options.getString('display_name', false);
  const newNotes = interaction.options.getString('notes', false);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // 查找用户
    const user = await findExternalUser(guildId, identifier);
    if (!user) {
      await interaction.editReply(`❌ External user **${identifier}** not found.`);
      return;
    }

    const updates: Partial<{
      vrchatName: string;
      virtualRoles: string[];
      displayName: string;
      notes: string;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    // 更新 VRChat 名称
    if (newVrchatName) {
      const cleanName = sanitizeVRChatName(newVrchatName);
      const validation = validateVRChatName(cleanName);
      if (!validation.valid) {
        await interaction.editReply(`❌ ${validation.error}`);
        return;
      }
      updates.vrchatName = cleanName;
    }

    // 更新角色
    if (newRolesString) {
      const roleNames = parseRoles(newRolesString);
      const roleValidation = validateRoles(interaction.guild!, roleNames);
      if (!roleValidation.valid) {
        await interaction.editReply(`❌ ${roleValidation.error}`);
        return;
      }
      updates.virtualRoles = roleNames;
    }

    // 更新显示名称
    if (newDisplayName) {
      updates.displayName = newDisplayName;
    }

    // 更新备注
    if (newNotes) {
      updates.notes = newNotes;
    }

    // 应用更新
    await ExternalUser.updateOne(
      { _id: user._id },
      { $set: updates }
    );

    const updatedUser = await ExternalUser.findById(user._id);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Admin Action: Update External User',
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTitle('✅ External User Updated')
      .setDescription(`Successfully updated external user **${user.vrchatName}**`)
      .setColor(EMBED_COLORS.SUCCESS)
      .addFields(
        {
          name: '🎮 VRChat Information',
          value: `**Name:** ${updatedUser!.vrchatName}${updatedUser!.displayName ? `\n**Display:** ${updatedUser!.displayName}` : ''}`,
          inline: true
        },
        {
          name: '🎭 Current Roles',
          value: updatedUser!.virtualRoles.map(r => `• ${r}`).join('\n'),
          inline: true
        }
      )
      .setFooter({
        text: `Updated by ${interaction.user.username} • ${interaction.guild!.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info(`External user ${user.vrchatName} updated in ${interaction.guild!.name} by ${interaction.user.username}`);
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * /external remove - 删除外部用户
 */
export async function handleExternalRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!requireAdmin(interaction)) return;

  const identifier = interaction.options.getString('identifier', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // 查找用户
    const user = await findExternalUser(guildId, identifier);
    if (!user) {
      await interaction.editReply(`❌ External user **${identifier}** not found.`);
      return;
    }

    // 保存信息用于显示
    const vrchatName = user.vrchatName;
    const roles = user.virtualRoles;
    const addedDays = Math.floor((Date.now() - user.addedAt.getTime()) / (1000 * 60 * 60 * 24));

    // 删除用户
    await ExternalUser.deleteOne({ _id: user._id });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Admin Action: Remove External User',
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTitle('✅ External User Removed')
      .setDescription(`Successfully removed external user **${vrchatName}**`)
      .setColor(EMBED_COLORS.ERROR)
      .addFields(
        {
          name: '🎮 VRChat Name',
          value: vrchatName,
          inline: true
        },
        {
          name: '🎭 Had Roles',
          value: roles.map(r => `• ${r}`).join('\n'),
          inline: true
        },
        {
          name: '📅 Record Duration',
          value: `${addedDays} days`,
          inline: true
        }
      )
      .setFooter({
        text: `Removed by ${interaction.user.username} • ${interaction.guild!.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info(`External user ${vrchatName} removed from ${interaction.guild!.name} by ${interaction.user.username}`);
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * /external list - 列出外部用户
 */
export async function handleExternalList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!requireAdmin(interaction)) return;

  const roleFilter = interaction.options.getString('role');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // 查询外部用户
    const query: {
      guildId: string;
      virtualRoles?: string;
    } = { guildId };
    if (roleFilter) {
      query.virtualRoles = roleFilter;
    }

    const users = await ExternalUser.find(query).sort({ addedAt: -1 });

    if (users.length === 0) {
      const message = roleFilter
        ? `No external users found with role **${roleFilter}**.`
        : 'No external users found in this server.';
      await interaction.editReply(message);
      return;
    }

    // 创建 Embed（分页显示，每页最多 10 个）
    const PAGE_SIZE = 10;
    const totalPages = Math.ceil(users.length / PAGE_SIZE);
    const page = 0; // 默认第一页

    const startIdx = page * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, users.length);
    const pageUsers = users.slice(startIdx, endIdx);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: interaction.guild!.name,
        iconURL: interaction.guild!.iconURL() || undefined
      })
      .setTitle('📋 External Users List')
      .setDescription(
        roleFilter
          ? `Showing external users with role **${roleFilter}**`
          : 'Showing all external users'
      )
      .setColor(EMBED_COLORS.INFO)
      .setFooter({
        text: `Page ${page + 1}/${totalPages} • Total: ${users.length} users • Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTimestamp();

    // 添加用户字段
    pageUsers.forEach((user, idx) => {
      const userInfo = 
        `**VRChat:** ${user.vrchatName}\n` +
        `**Roles:** ${user.virtualRoles.join(', ')}\n` +
        `**Added:** <t:${Math.floor(user.addedAt.getTime() / 1000)}:R>`;

      embed.addFields({
        name: `${startIdx + idx + 1}. ${user.displayName || user.vrchatName}`,
        value: userInfo,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
