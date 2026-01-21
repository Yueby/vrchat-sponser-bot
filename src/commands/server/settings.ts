import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  PermissionsBitField,
  RoleSelectMenuBuilder,
  RepliableInteraction,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction,
} from "discord.js";
import {
  getMembersWithRoles,
  calculateBindingProgress,
} from "../../utils/binding";
import Guild from "../../models/Guild";
import User from "../../models/User";
import VRChatBinding from "../../models/VRChatBinding";
import { AVATAR_SIZES, EMBED_COLORS } from "../../config/constants";
import {
  handleCommandError,
  requireAdmin,
  requireGuild,
} from "../../utils/errors";
import { client } from "../../bot";
import { logger } from "../../utils/logger";
import { bulkUpsertDiscordUsers } from "../../utils/database";
import { smartDefer } from "../../utils/interactionHelper";

/**
 * 主入口：处理 /server 指令 (面板)
 */
export async function handleServerSettings(
  interaction: RepliableInteraction,
  statusMsg?: string,
): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;
  if (!requireAdmin(interaction)) return;

  // Single Message UI: Decide between deferUpdate (in-place) and deferReply (new msg)
  await smartDefer(interaction);

  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild) {
      await interaction.editReply("Guild settings not found.");
      return;
    }

    const guildInfo = client.guilds.cache.get(guildId);

    // 整合 Stats 数据
    const totalUsers = await User.countDocuments({ guildId });
    const bindingCount = await VRChatBinding.countDocuments({ guildId });
    const hasManagedRoles = guild.managedRoleIds?.length > 0;
    const progress = hasManagedRoles
      ? await calculateBindingProgress(guildId)
      : { percentage: 0 };

    const embed = new EmbedBuilder()
      .setTitle("Server Management Dashboard")
      .setDescription(
        statusMsg || "Overview of server statistics and bot configuration.",
      )
      .setColor(
        statusMsg?.includes("error") ? EMBED_COLORS.ERROR : EMBED_COLORS.INFO,
      )
      .setThumbnail(guildInfo?.iconURL({ size: AVATAR_SIZES.LARGE }) || null)
      .addFields(
        {
          name: "Statistics",
          value: `Members: **${totalUsers}**\nBindings: **${bindingCount}** (${progress.percentage}%)`,
          inline: true,
        },
        {
          name: "Sync Status",
          value: `${guild.isSyncing ? "Syncing..." : "Idle"}\nLast: ${guild.lastSyncAt ? `<t:${Math.floor(guild.lastSyncAt.getTime() / 1000)}:R>` : "Never"}`,
          inline: true,
        },
        {
          name: "Configuration",
          value: `Web API: ${guild.apiEnabled ? "✅ Enabled" : "❌ Disabled"}\nNotify: ${guild.notifyUserId ? `<@${guild.notifyUserId}>` : "None"}`,
          inline: false,
        },
      )
      .setTimestamp();

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("server_btn_sync")
        .setLabel("Sync Now")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(guild.isSyncing || !hasManagedRoles || !guild.apiEnabled), // Disable sync if API disabled? Or separate concern? Actually sync is internal.
      // Wait, Perform Sync uses internal logic, not API. So it should be fine.
      // Updated requirement: Sync is independent.
      // But let's check PerformSync logic. It uses database directly.
    );

    // Row 1: Core Actions
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId("server_btn_roles")
        .setLabel("Manage Roles")
        .setStyle(ButtonStyle.Secondary),
    );

    // Row 2: Settings
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("server_btn_notify_user")
        .setLabel("Set Notify User")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("server_btn_toggle_api")
        .setLabel(guild.apiEnabled ? "Disable API" : "Enable API")
        .setStyle(guild.apiEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("server_btn_api_key")
        .setLabel("View API Key")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!guild.apiEnabled),
    );

    await interaction.editReply({
      embeds: [embed],
      components: [row1, row2],
      content: "",
    });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 切换 API 状态
 */
export async function handleToggleApi(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();

  const guild = await Guild.findOne({ guildId });
  if (!guild) return;

  guild.apiEnabled = !guild.apiEnabled;
  await guild.save();

  await handleServerSettings(
    interaction,
    `Web API has been ${guild.apiEnabled ? "enabled" : "disabled"}.`,
  );
}

/**
 * 显示通知用户选择器
 */
export async function showNotifyUserSelect(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();

  const guild = await Guild.findOne({ guildId });

  const embed = new EmbedBuilder()
    .setTitle("Notification Settings")
    .setDescription(
      "Select a user to receive binding notifications (e.g. when new members are synced).",
    )
    .setColor(EMBED_COLORS.INFO);

  const select = new UserSelectMenuBuilder()
    .setCustomId("server_select_notify_user")
    .setPlaceholder("Select a User")
    .setMaxValues(1);

  if (guild?.notifyUserId) {
    select.setDefaultUsers([guild.notifyUserId]);
  }

  const row1 = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    select,
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("server_btn_back")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ embeds: [embed], components: [row1, row2] });
}

/**
 * 处理通知用户更新
 */
export async function handleNotifyUserSelect(
  interaction: UserSelectMenuInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferUpdate();
  const userId = interaction.values[0];

  await Guild.updateOne({ guildId }, { notifyUserId: userId });

  await handleServerSettings(
    interaction,
    `✅ Notification user updated to <@${userId}>.`,
  );
}

/**
 * 执行同步
 */
export async function performSyncNow(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();

  const startTime = Date.now();
  const guild = await Guild.findOne({ guildId });
  if (!guild || guild.managedRoleIds.length === 0) {
    await handleServerSettings(interaction, "🔴 No managed roles configured.");
    return;
  }

  await Guild.updateOne({ guildId }, { isSyncing: true });
  // Show syncing state
  // We can call handleServerSettings but statusMsg logic needs to be robust.
  // For now, let's just wait it out or show a temp state if it takes long.
  // Given we just deferred update, we can assume UI is static until editReply.
  // But user might want feedback.
  // Let's try to show 'Syncing...' by editing the embed description manually?
  // Or just trusting it's fast.
  // Let's use handleServerSettings to show Syncing.
  await handleServerSettings(interaction, "🔄 Syncing started...");

  const members = await getMembersWithRoles(
    interaction.guild!,
    guild.managedRoleIds,
  );
  if (members.length === 0) {
    await Guild.updateOne(
      { guildId },
      { isSyncing: false, lastSyncAt: new Date() },
    );
    await handleServerSettings(
      interaction,
      "🔴 No members found with managed roles.",
    );
    return;
  }

  const { upsertedCount, modifiedCount } = await bulkUpsertDiscordUsers(
    members,
    guildId,
  );

  await Guild.updateOne(
    { guildId },
    { lastSyncAt: new Date(), isSyncing: false },
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const status = `Sync Complete. Total: ${upsertedCount + modifiedCount} (New: ${upsertedCount}, Updated: ${modifiedCount}) in ${duration}s`;

  await handleServerSettings(interaction, status);

  logger.info(
    `Admin ${interaction.user.username} triggered manual sync in ${interaction.guild!.name}`,
  );
}

/**
 * Role 管理面板
 */
export async function handleRoleManagement(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();

  const guild = await Guild.findOne({ guildId });
  const roleIds = guild?.managedRoleIds || [];

  const roleNames =
    roleIds.map((id) => `<@&${id}>`).join("\n") || "No roles configured.";

  const embed = new EmbedBuilder()
    .setTitle("Managed Roles")
    .setDescription("The bot will track members with these roles.")
    .setColor(EMBED_COLORS.INFO)
    .addFields({ name: "Roles", value: roleNames });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("server_btn_role_add")
      .setLabel("Add Role")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("server_btn_role_clear")
      .setLabel("Clear All")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(roleIds.length === 0),
    new ButtonBuilder()
      .setCustomId("server_btn_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({
    embeds: [embed],
    components: [row as any],
    content: "",
  });
}

/**
 * 添加 Role (显示 Select Menu)
 */
export async function handleAddRole(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();

  const select = new RoleSelectMenuBuilder()
    .setCustomId("server_role_select")
    .setPlaceholder("Select a role to add")
    .setMaxValues(1);

  const row = new ActionRowBuilder<any>().addComponents(select);
  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("server_btn_roles")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({
    content: "Select a role to add as a sponsor role:",
    embeds: [],
    components: [row, backRow],
  });
}

/**
 * 处理 Role 选择
 */
export async function handleRoleSelect(
  interaction: any,
  guildId: string,
): Promise<void> {
  await interaction.deferUpdate();
  const roleId = interaction.values[0];

  const guild = await Guild.findOne({ guildId });
  if (guild && !guild.managedRoleIds.includes(roleId)) {
    guild.managedRoleIds.push(roleId);
    await guild.save();
  }

  await handleRoleManagement(interaction, guildId);
}

/**
 * 清除 Roles
 */
export async function handleClearRoles(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferUpdate();
  await Guild.updateOne({ guildId }, { $set: { managedRoleIds: [] } });
  await handleRoleManagement(interaction, guildId);
}

/**
 * 显示 API Key
 */
export async function showApiKey(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferUpdate();

  const guild = await Guild.findOne({ guildId });
  if (!guild || !guild.apiEnabled) {
    await handleServerSettings(interaction as any, "Web API is disabled.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Web API Access")
    .setColor(EMBED_COLORS.WARNING)
    .setDescription(
      "**Keep this URL secret!** It grants read access to sponsor data.",
    )
    .addFields({
      name: "API Endpoint",
      value: `\`/api/vrchat/sponsors/${guildId}\``,
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("server_btn_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}
