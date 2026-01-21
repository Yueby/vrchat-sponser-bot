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

  // interaction.deferReply handled by caller or we handle it if not deferred
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

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
          value: `Web API: ${guild.apiEnabled ? "Enabled" : "Disabled"}\nNotify: ${guild.notifyUserId ? `<@${guild.notifyUserId}>` : "None"}`,
          inline: false,
        },
      )
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("server_btn_sync")
        .setLabel("Sync Now")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(guild.isSyncing),
      new ButtonBuilder()
        .setCustomId("server_btn_config_modal")
        .setLabel("Configure Settings")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("server_btn_api_key")
        .setLabel("Get API Key")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!guild.apiEnabled),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 显示配置 Modal
 */
export async function showConfigModal(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  const guild = await Guild.findOne({ guildId });
  if (!guild) return;

  const modal = new ModalBuilder()
    .setCustomId("server_config_submit")
    .setTitle("Server Configuration");

  const notifyInput = new TextInputBuilder()
    .setCustomId("notify_user_id")
    .setLabel("Notification User ID (Optional)")
    .setPlaceholder("Enter Discord User ID")
    .setStyle(TextInputStyle.Short)
    .setValue(guild.notifyUserId || "")
    .setRequired(false);

  const apiInput = new TextInputBuilder()
    .setCustomId("api_status")
    .setLabel('Enable Web API? (Type "yes" or "no")')
    .setStyle(TextInputStyle.Short)
    .setValue(guild.apiEnabled ? "yes" : "no")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(notifyInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(apiInput),
  );

  await interaction.showModal(modal);
}

/**
 * 处理配置提交
 */
export async function handleServerConfigSubmit(
  interaction: ModalSubmitInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const notifyId = interaction.fields.getTextInputValue("notify_user_id");
  const apiStatus = interaction.fields
    .getTextInputValue("api_status")
    .toLowerCase();

  try {
    const guild = await Guild.findOne({ guildId });
    if (!guild) return;

    guild.notifyUserId = notifyId.trim() || undefined;

    if (
      apiStatus.includes("yes") ||
      apiStatus.includes("true") ||
      apiStatus === "1"
    ) {
      guild.apiEnabled = true;
    } else {
      guild.apiEnabled = false;
    }

    await guild.save();
    await handleServerSettings(
      interaction,
      "Configuration updated successfully.",
    );
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 执行同步
 */
export async function performSyncNow(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const startTime = Date.now();
  const guild = await Guild.findOne({ guildId });
  if (!guild || guild.managedRoleIds.length === 0) {
    await interaction.editReply(
      "🔴 No managed roles configured. Use `/server roles add` first.",
    );
    return;
  }

  const members = await getMembersWithRoles(
    interaction.guild!,
    guild.managedRoleIds,
  );
  if (members.length === 0) {
    await interaction.editReply("🔴 No members found with managed roles.");
    return;
  }

  // @ts-ignore
  const { upsertedCount, modifiedCount } =
    await import("../../utils/database").then((m) =>
      m.bulkUpsertDiscordUsers(members, guildId),
    );
  await Guild.updateOne(
    { guildId },
    { lastSyncAt: new Date(), isSyncing: false },
  ); // Ensure syncing state is reset

  const embed = new EmbedBuilder()
    .setTitle("Sync Complete")
    .setColor(EMBED_COLORS.SUCCESS)
    .addFields(
      {
        name: "Stats",
        value: `Total: ${upsertedCount + modifiedCount}\nNew: ${upsertedCount}\nUpdated: ${modifiedCount}`,
        inline: true,
      },
      {
        name: "Duration",
        value: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        inline: true,
      },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  logger.info(
    `Admin ${interaction.user.username} triggered manual sync in ${interaction.guild!.name}`,
  );
}

/**
 * 显示 Role 管理面板
 */
export async function handleRoleManagement(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = await Guild.findOne({ guildId });
  const roles = guild?.managedRoleIds || [];

  const roleList =
    roles.length > 0
      ? roles.map((id) => `<@&${id}>`).join("\n")
      : "No roles configured.";

  const embed = new EmbedBuilder()
    .setTitle("Managed Roles Configuration")
    .setDescription(`These roles are tracked as sponsors.\n\n${roleList}`)
    .setColor(EMBED_COLORS.INFO);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("server_btn_role_add")
      .setLabel("Add Role")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("server_btn_role_clear")
      .setLabel("Clear All")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("server_btn_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

/**
 * 显示添加 Role 的选择器
 */
export async function handleAddRole(
  interaction: ButtonInteraction,
): Promise<void> {
  // @ts-ignore
  const { RoleSelectMenuBuilder } = await import("discord.js");

  const select = new RoleSelectMenuBuilder()
    .setCustomId("server_role_select")
    .setPlaceholder("Select a role to add")
    .setMaxValues(1);

  const row = new ActionRowBuilder<any>().addComponents(select);

  await interaction.reply({
    content: "Select a role to add as a sponsor role:",
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 处理 Role 选择
 */
export async function handleRoleSelect(
  interaction: any,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const roleId = interaction.values[0];

  const guild = await Guild.findOne({ guildId });
  if (!guild) return;

  if (guild.managedRoleIds.includes(roleId)) {
    await interaction.editReply("This role is already managed.");
    return;
  }

  guild.managedRoleIds.push(roleId);
  await guild.save();

  // 触发同步 (可选，这里还是简单提示)
  await interaction.editReply(`Role <@&${roleId}> added to managed roles.`);

  // 可以在这里重新显示 Manage Roles 面板，或者让用户手动点返回。
  // 为了体验，我们不自动跳回，因为这通常是临时消息。
}

/**
 * 清除 Roles
 */
export async function handleClearRoles(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await Guild.updateOne({ guildId }, { $set: { managedRoleIds: [] } });
  await interaction.editReply("All managed roles have been cleared.");
  await handleRoleManagement(interaction, guildId);
}

/**
 * 显示 API Key
 */
export async function showApiKey(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = await Guild.findOne({ guildId });
  if (!guild || !guild.apiEnabled) {
    await interaction.editReply("Web API is disabled.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Web API Access")
    .setColor(EMBED_COLORS.WARNING)
    .setDescription(
      "**Keep this URL secret!** It grants read access to sponsor data.",
    )
    .addFields({
      name: "Endpoint URL",
      value: `\`http://${process.env.DOMAIN || "localhost"}:${process.env.PORT || 3000}/api/vrchat/sponsors/${guildId}\``,
    });

  await interaction.editReply({ embeds: [embed] });
}
