import {
  ActionRowBuilder,
  Interaction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserContextMenuCommandInteraction,
  ButtonStyle,
  ButtonBuilder,
  EmbedBuilder,
  ButtonInteraction,
  ModalSubmitInteraction,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  User as DiscordUser,
} from "discord.js";
import {
  handleUserProfile,
  showBindModal,
  handleViewHistory,
  handleMeModalSubmit,
} from "../commands/user/me";
import {
  handleServerSettings,
  performSyncNow,
  showConfigModal,
  showApiKey,
  handleRoleManagement,
  handleAddRole,
  handleClearRoles,
  handleRoleSelect,
  handleServerConfigSubmit,
  handleClearRoles as handleClearRolesSettings,
} from "../commands/server/settings";
import {
  handleAdminPanel,
  showSearchModal,
  handleRefreshCache,
  handleViewSponsors,
  handleViewUnbound,
  showAddSponsorModal,
  showEditSponsorModal,
  handleDeleteUser,
  handleSearchSubmit,
  handleAddSponsorSubmit,
  handleEditSponsorSubmit,
} from "../commands/admin/panel";
import { requireAdmin, requireGuild } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * 统一处理所有交互 (按钮, 模态框, 上下文菜单)
 */
export async function handleInteraction(
  interaction: Interaction,
): Promise<void> {
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
    logger.error("Interaction Error:", error);
    if ("reply" in interaction) {
      const repliable = interaction as unknown as ButtonInteraction;
      if (repliable.deferred || repliable.replied) {
        await repliable.editReply({
          content: "🔴 An error occurred while processing the interaction.",
        });
      } else {
        await repliable.reply({
          content: "🔴 An error occurred while processing the interaction.",
          ephemeral: true,
        });
      }
    }
  }
}

/**
 * 处理按钮点击
 */
async function handleButtonInteraction(
  interaction: ButtonInteraction,
): Promise<void> {
  const { customId } = interaction;
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  // --- User / Me Interactions ---
  if (customId === "me_bind_modal_open") {
    await showBindModal(interaction, guildId);
  } else if (customId === "me_refresh" || customId === "me_back_profile") {
    await handleUserProfile(interaction, guildId);
  } else if (customId.startsWith("me_view_history")) {
    const targetId = customId.split("_").pop();
    await handleViewHistory(
      interaction,
      guildId,
      targetId === "history" ? undefined : targetId,
    );
  }

  // --- Server Interactions ---
  else if (customId.startsWith("server_btn_")) {
    if (!requireAdmin(interaction)) return;

    if (customId === "server_btn_sync") {
      await performSyncNow(interaction, guildId);
    } else if (customId === "server_btn_config_modal") {
      await showConfigModal(interaction, guildId);
    } else if (customId === "server_btn_api_key") {
      await showApiKey(interaction, guildId);
    } else if (customId === "server_btn_roles") {
      await handleRoleManagement(interaction, guildId);
    } else if (customId === "server_btn_role_add") {
      await handleAddRole(interaction);
    } else if (customId === "server_btn_role_clear") {
      await handleClearRoles(interaction, guildId);
    } else if (customId === "server_btn_back") {
      await handleServerSettings(interaction, guildId);
    }
  }

  // --- Role Select ---
  else if (
    interaction.isRoleSelectMenu() &&
    customId === "server_role_select"
  ) {
    if (!requireAdmin(interaction)) return;
    await handleRoleSelect(interaction, guildId);
  }

  // --- Admin Interactions ---
  else if (customId.startsWith("admin_btn_")) {
    if (!requireAdmin(interaction)) return;

    if (customId === "admin_btn_search") {
      await showSearchModal(interaction);
    } else if (customId === "admin_btn_back") {
      await handleAdminPanel(interaction, guildId);
    } else if (customId === "admin_btn_refresh") {
      await handleRefreshCache(interaction, guildId);
    } else if (customId === "admin_btn_list") {
      await handleViewSponsors(interaction, guildId);
    } else if (customId === "admin_btn_unbound") {
      await handleViewUnbound(interaction, guildId);
    } else if (customId === "admin_btn_add") {
      await showAddSponsorModal(interaction);
    }
  }

  // --- Admin User Actions (Edit/Delete) ---
  else if (
    customId.startsWith("admin_btn_user_edit_") ||
    customId.startsWith("btn_admin_edit_")
  ) {
    if (!requireAdmin(interaction)) return;
    const userId = customId
      .replace("admin_btn_user_edit_", "")
      .replace("btn_admin_edit_", "");
    await showEditSponsorModal(interaction, userId);
  } else if (customId.startsWith("btn_admin_remove_")) {
    if (!requireAdmin(interaction)) return;
    const userId = customId.replace("btn_admin_remove_", "");
    await handleDeleteUser(interaction, guildId, userId);
  }
}

/**
 * 处理模态框提交
 */
async function handleModalInteraction(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const { customId } = interaction;
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (customId === "me_bind_submit") {
    await handleMeModalSubmit(interaction, guildId);
  } else if (customId === "server_config_submit") {
    await handleServerConfigSubmit(interaction, guildId);
  } else if (customId === "admin_search_submit") {
    await handleSearchSubmit(interaction, guildId);
  } else if (customId === "admin_add_submit") {
    await handleAddSponsorSubmit(interaction, guildId);
  } else if (customId.startsWith("modal_admin_user_")) {
    await handleEditSponsorSubmit(interaction, guildId);
  }
}

/**
 * 处理用户上下文菜单
 */
/**
 * 处理用户上下文菜单
 */
async function handleUserContextMenuInteraction(
  interaction: UserContextMenuCommandInteraction,
): Promise<void> {
  const { commandName, targetUser } = interaction;
  const guildId = requireGuild(interaction);

  if (!guildId) return;

  if (commandName === "View VRChat Profile") {
    await handleUserProfile(interaction, guildId, targetUser);
  } else if (commandName === "Manage Sponsor") {
    if (!requireAdmin(interaction)) return;
    await showAdminManagePanel(interaction, guildId, targetUser);
  }
}

/**
 * 管理员快捷管理面板
 */
async function showAdminManagePanel(
  interaction: UserContextMenuCommandInteraction,
  guildId: string,
  targetUser: DiscordUser,
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle(`Manage Sponsor: ${targetUser.username}`)
    .setDescription(`Quick actions for <@${targetUser.id}>`)
    .setColor(0x5865f2);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_admin_edit_${targetUser.id}`)
      .setLabel("Modify Info")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_admin_remove_${targetUser.id}`)
      .setLabel("Remove User")
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}
