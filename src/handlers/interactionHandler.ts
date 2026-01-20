import { ActionRowBuilder, Interaction, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, UserContextMenuCommandInteraction, ButtonStyle, ButtonBuilder, EmbedBuilder, ButtonInteraction, ModalSubmitInteraction, AutocompleteInteraction, ChatInputCommandInteraction, User as DiscordUser } from 'discord.js';
import { handleUserProfile } from '../commands/user/me';
import { handleServerSettings } from '../commands/server/settings';
import { requireAdmin, requireGuild } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * 统一处理所有交互 (按钮, 模态框, 上下文菜单)
 */
export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalInteraction(interaction);
    } else if (interaction.isUserContextMenuCommand()) {
      await handleUserContextMenuInteraction(interaction);
    }
  } catch (error) {
    logger.error('Interaction Error:', error);
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '🔴 An error occurred while processing the interaction.' });
      } else {
        await interaction.reply({ content: '🔴 An error occurred while processing the interaction.', ephemeral: true });
      }
    }
  }
}

/**
 * 处理按钮点击
 */
async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const { customId } = interaction;
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  // --- User / Me Interactions ---
  if (customId === 'me_bind_modal_open') {
    await import('../commands/user/me').then(m => m.showBindModal(interaction, guildId));
  } else if (customId === 'me_refresh' || customId === 'me_back_profile') {
    await import('../commands/user/me').then(m => m.handleUserProfile(interaction, guildId));
  } else if (customId.startsWith('me_view_history')) {
    const targetId = customId.split('_').pop(); // Handle 'me_view_history' or 'me_view_history_123'
    await import('../commands/user/me').then(m => m.handleViewHistory(interaction, guildId, targetId === 'history' ? undefined : targetId));
  } 

  // --- Server Interactions ---
  else if (customId.startsWith('server_btn_')) {
    if (!requireAdmin(interaction)) return;
    
    if (customId === 'server_btn_sync') {
      await import('../commands/server/settings').then(m => m.performSyncNow(interaction, guildId));
    } else if (customId === 'server_btn_config_modal') {
      await import('../commands/server/settings').then(m => m.showConfigModal(interaction, guildId));
    } else if (customId === 'server_btn_api_key') {
      await import('../commands/server/settings').then(m => m.showApiKey(interaction, guildId));
    } else if (customId === 'server_btn_roles') {
      await import('../commands/server/settings').then(m => m.handleRoleManagement(interaction, guildId));
    } else if (customId === 'server_btn_role_add') {
      await import('../commands/server/settings').then(m => m.handleAddRole(interaction));
    } else if (customId === 'server_btn_role_clear') {
      await import('../commands/server/settings').then(m => m.handleClearRoles(interaction, guildId));
    } else if (customId === 'server_btn_back') {
      await import('../commands/server/settings').then(m => m.handleServerSettings(interaction));
    }
  } 

  // --- Role Select ---
  else if (interaction.isRoleSelectMenu() && customId === 'server_role_select') {
    if (!requireAdmin(interaction)) return;
    await import('../commands/server/settings').then(m => m.handleRoleSelect(interaction, guildId));
  }

  // --- Admin Interactions ---
  else if (customId.startsWith('admin_btn_')) {
    if (!requireAdmin(interaction)) return;
    
    if (customId === 'admin_btn_search') {
      await import('../commands/admin/panel').then(m => m.showSearchModal(interaction));
    } else if (customId === 'admin_btn_back') {
      await import('../commands/admin/panel').then(m => m.handleAdminPanel(interaction));
    } else if (customId === 'admin_btn_refresh') {
       await import('../commands/admin/panel').then(m => m.handleRefreshCache(interaction, guildId));
    } else if (customId === 'admin_btn_list') {
      await import('../commands/admin/panel').then(m => m.handleViewSponsors(interaction, guildId));
    } else if (customId === 'admin_btn_unbound') {
      await import('../commands/admin/panel').then(m => m.handleViewUnbound(interaction, guildId));
    } else if (customId === 'admin_btn_add') {
      await import('../commands/admin/panel').then(m => m.showAddSponsorModal(interaction));
    }
  }
  
  // --- Admin User Actions (Edit/Delete) ---
  else if (customId.startsWith('admin_btn_user_edit_') || customId.startsWith('btn_admin_edit_')) {
    if (!requireAdmin(interaction)) return;
    const userId = customId.replace('admin_btn_user_edit_', '').replace('btn_admin_edit_', '');
    await import('../commands/admin/panel').then(m => m.showEditSponsorModal(interaction, userId));
  } else if (customId.startsWith('btn_admin_remove_')) {
    if (!requireAdmin(interaction)) return;
    const userId = customId.replace('btn_admin_remove_', '');
    await import('../commands/admin/panel').then(m => m.handleDeleteUser(interaction, guildId, userId));
  }
}

/**
 * 处理模态框提交
 */
async function handleModalInteraction(interaction: ModalSubmitInteraction): Promise<void> {
  const { customId } = interaction;
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (customId === 'me_bind_submit') {
    await import('../commands/user/me').then(m => m.handleMeModalSubmit(interaction, guildId));
  } else if (customId === 'server_config_submit') {
    await import('../commands/server/settings').then(m => m.handleServerConfigSubmit(interaction, guildId));
  } else if (customId === 'admin_search_submit') {
    await import('../commands/admin/panel').then(m => m.handleSearchSubmit(interaction, guildId));
  } else if (customId === 'admin_add_submit') {
    await import('../commands/admin/panel').then(m => m.handleAddSponsorSubmit(interaction, guildId));
  } else if (customId.startsWith('modal_admin_user_')) {
    await import('../commands/admin/panel').then(m => m.handleEditSponsorSubmit(interaction, guildId));
  }
}

/**
 * 处理用户上下文菜单
 */
/**
 * 处理用户上下文菜单
 */
async function handleUserContextMenuInteraction(interaction: UserContextMenuCommandInteraction): Promise<void> {
  const { commandName, targetUser } = interaction;
  const guildId = requireGuild(interaction);

  if (!guildId) return;

  if (commandName === 'View VRChat Profile') {
    await handleUserProfile(interaction, guildId, targetUser);
  } else if (commandName === 'Manage Sponsor') {
    if (!requireAdmin(interaction)) return;
    await showAdminManagePanel(interaction, guildId, targetUser);
  }
}

/**
 * 管理员快捷管理面板
 */
async function showAdminManagePanel(interaction: UserContextMenuCommandInteraction, guildId: string, targetUser: DiscordUser): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle(`Manage Sponsor: ${targetUser.username}`)
    .setDescription(`Quick actions for <@${targetUser.id}>`)
    .setColor(0x5865F2);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_admin_edit_${targetUser.id}`)
      .setLabel('Modify Info')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_admin_remove_${targetUser.id}`)
      .setLabel('Remove User')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
