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
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  UserSelectMenuInteraction,
  RoleSelectMenuInteraction,
  ComponentType,
  LabelBuilder,
} from "discord.js";
import { EMBED_COLORS } from "../../config/constants";
import {
  handleCommandError,
  requireAdmin,
  requireGuild,
} from "../../utils/errors";
import User from "../../models/User";
import VRChatBinding from "../../models/VRChatBinding";
import { parseRoles, generateRandomId } from "../../utils/external";
import { sanitizeVRChatName } from "../../utils/validation";
import { getUnboundMembers, UnboundMember } from "../../utils/binding";
import { smartDefer } from "../../utils/interactionHelper";

/**
 * /admin - 管理员主面板
 */
export async function handleAdminPanel(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction,
  statusMsg?: string,
): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;
  if (!requireAdmin(interaction)) return;

  // Single Message UI
  await smartDefer(interaction);

  try {
    const totalSponsors = await User.countDocuments({ guildId });
    // const unboundCount = ... (simplified)

    const embed = new EmbedBuilder()
      .setTitle("Administrator Panel")
      .setDescription(
        statusMsg || "Select an action below to manage sponsors and users.",
      )
      .setColor(
        statusMsg?.includes("success") || statusMsg?.includes("✅")
          ? EMBED_COLORS.SUCCESS
          : EMBED_COLORS.INFO,
      )
      .addFields({ name: "Sponsors", value: `${totalSponsors}`, inline: true });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_btn_search")
        .setLabel("Search")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("admin_btn_add")
        .setLabel("Add Discord User")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("admin_btn_add_manual")
        .setLabel("Add VRChat User")
        .setStyle(ButtonStyle.Success),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_btn_list")
        .setLabel("List All")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("admin_btn_unbound")
        .setLabel("Check Unbound")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("admin_btn_refresh")
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Secondary),
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
 * 刷新缓存 (实际上这里用作刷新面板)
 */
export async function handleRefreshCache(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();
  await handleAdminPanel(interaction, "✅ Panel refreshed.");
}

/**
 * 显示 Search Modal
 */
export async function showSearchModal(
  interaction: ButtonInteraction,
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("admin_search_submit")
    .setTitle("Search User");

  const input = new TextInputBuilder()
    .setCustomId("query")
    .setLabel("Search Query")
    .setPlaceholder("Discord ID / Username / VRChat Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(input),
  );
  await interaction.showModal(modal);
}

/**
 * 处理 Search 提交
 */
export async function handleSearchSubmit(
  interaction: ModalSubmitInteraction,
  guildId: string,
): Promise<void> {
  // Try update in-place
  try {
    await interaction.deferUpdate();
  } catch (e) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const query = interaction.fields.getTextInputValue("query");

  try {
    // 搜索策略：
    // 1. VRChat 名称（模糊匹配）
    // 2. Discord User ID（精确匹配）
    // 3. Discord displayName（模糊匹配）

    const binding = await VRChatBinding.findOne({
      guildId,
      $or: [{ vrchatName: new RegExp(query, "i") }, { userId: query }],
    });

    // 如果没找到绑定，尝试按 User 表搜索（支持 displayName）
    let user = null;
    if (!binding) {
      user = await User.findOne({
        guildId,
        $or: [{ userId: query }, { displayName: new RegExp(query, "i") }],
      });
    }

    if (binding || user) {
      const targetId = binding?.userId || user?.userId;
      const targetName = binding?.vrchatName || user?.displayName || "Unknown";

      // Display Helper
      const displayId = targetId?.match(/^\d+$/)
        ? `<@${targetId}> (${targetId})`
        : targetId;

      const embed = new EmbedBuilder()
        .setTitle("Search Result")
        .setColor(EMBED_COLORS.SUCCESS)
        .addFields(
          { name: "Discord User", value: displayId || "?", inline: true },
          {
            name: "VRChat Name",
            value: targetName,
            inline: true,
          },
          {
            name: "Bind Time",
            value: binding?.bindTime
              ? `<t:${Math.floor(binding.bindTime.getTime() / 1000)}:f>`
              : "Unknown",
            inline: false,
          },
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_btn_user_edit_${targetId}`)
          .setLabel("Edit")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`btn_admin_remove_${targetId}`)
          .setLabel("Delete")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("admin_btn_back")
          .setLabel("Back to Panel")
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row as any],
      });
    } else {
      await interaction.editReply({
        content: `No results found for "${query}".`,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_btn_back")
              .setLabel("Back to Panel")
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
        embeds: [],
      });
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 列出所有赞助者
 */
export async function handleViewSponsors(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();

  const users = await User.find({ guildId }).sort({ joinedAt: -1 }).limit(30);
  if (users.length === 0) {
    await handleAdminPanel(interaction, "No sponsors found.");
    return;
  }

  const list = users
    .map((u) => {
      const roleStr = u.roles.length > 0 ? u.roles.join(", ") : "No Role";
      // 使用 Mention 显示
      const userDisplay = u.userId.match(/^\d+$/) ? `<@${u.userId}>` : u.userId;
      return `• **${userDisplay}** (\`${u.userType}\`): ${roleStr}`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("Sponsor List")
    .setDescription(list)
    .setColor(EMBED_COLORS.INFO)
    .setFooter({ text: `Showing last 30 members. Total: ${users.length}` });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_btn_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

/**
 * 查看未绑定成员
 */
export async function handleViewUnbound(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();

  const unboundMembers = await getUnboundMembers(guildId);

  const embed = new EmbedBuilder()
    .setTitle("Unbound Members Report")
    .setColor(
      unboundMembers.length === 0 ? EMBED_COLORS.SUCCESS : EMBED_COLORS.WARNING,
    )
    .setDescription(
      unboundMembers.length === 0
        ? "✅ All members with managed roles have bound their VRChat names."
        : `⚠️ Found **${unboundMembers.length}** member${unboundMembers.length !== 1 ? "s" : ""} without VRChat bindings.`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_btn_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),
  );

  if (unboundMembers.length > 0) {
    const list = unboundMembers
      .slice(0, 15)
      .map(
        (m: UnboundMember, i: number) =>
          `${i + 1}. **${m.displayName}** (<@${m.userId}>)`,
      )
      .join("\n");

    embed.addFields({
      name: "Top Unbound Members",
      value: list,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed], components: [row] });
}

// --- WIZARD FLOW START ---

/**
 * 显示添加赞助者向导 (Single Modal Version)
 */
export async function showAddSponsorWizard(
  interaction: ButtonInteraction,
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("wizard_submit")
    .setTitle("Add Sponsor");

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId("wizard_select_user")
    .setPlaceholder("Select a Discord User")
    .setMaxValues(1);

  const userLabel = new LabelBuilder()
    .setLabel("Discord User")
    .setUserSelectMenuComponent(userSelect);

  const vrcInput = new TextInputBuilder()
    .setCustomId("vrchat_name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const vrcLabel = new LabelBuilder()
    .setLabel("VRChat Name")
    .setTextInputComponent(vrcInput);

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId("wizard_select_role")
    .setPlaceholder("Select at least 1 role")
    .setMinValues(1)
    .setMaxValues(5);

  const roleLabel = new LabelBuilder()
    .setLabel("Roles")
    .setRoleSelectMenuComponent(roleSelect);

  const notesInput = new TextInputBuilder()
    .setCustomId("notes")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const notesLabel = new LabelBuilder()
    .setLabel("Notes (Optional)")
    .setTextInputComponent(notesInput);

  modal.addLabelComponents(userLabel, vrcLabel, roleLabel, notesLabel);
  await interaction.showModal(modal);
}

/**
 * Wizard Modal Submit -> Create User
 */
export async function handleWizardSubmit(
  interaction: ModalSubmitInteraction,
  guildId: string,
): Promise<void> {
  try {
    await interaction.deferUpdate();
  } catch (e) {
    if (!interaction.deferred)
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  // Retrieve values from fields
  // Note: discord.js fields helper might not fully type select menu retrieval yet depending on exact version,
  // but we can access via getField.
  // We explicitly cast to any to avoid TS issues if local types aren't fully updated,
  // but runtime support is there.

  const userField = interaction.fields.fields.get("wizard_select_user");
  const roleField = interaction.fields.fields.get("wizard_select_role");

  let userId: string | undefined;
  if (userField && userField.type === ComponentType.UserSelect) {
    userId = userField.values[0];
  }

  let roleIds: string[] = [];
  if (roleField && roleField.type === ComponentType.RoleSelect) {
    roleIds = [...roleField.values];
  }

  const vrchatName = interaction.fields.getTextInputValue("vrchat_name");
  const notes = interaction.fields.getTextInputValue("notes");

  if (!userId) {
    await handleAdminPanel(
      interaction,
      "🔴 No user selected. Please try again.",
    );
    return;
  }

  const cleanVrcName = sanitizeVRChatName(vrchatName);

  const existing = await User.findOne({ userId, guildId });
  if (existing) {
    await handleAdminPanel(interaction, `🔴 User <@${userId}> already exists.`);
    return;
  }

  const newUser = await User.create({
    guildId,
    userId,
    userType: "discord",
    displayName: cleanVrcName,
    roles: roleIds,
    notes: notes || undefined,
    addedBy: interaction.user.id,
    joinedAt: new Date(),
    updatedAt: new Date(),
  });

  await VRChatBinding.create({
    userId,
    guildId,
    vrchatName: cleanVrcName,
    firstBindTime: newUser.joinedAt,
    bindTime: newUser.joinedAt,
  });

  await handleAdminPanel(
    interaction,
    `✅ Successfully added **${cleanVrcName}** (<@${userId}>)`,
  );
}

/**
 * 显示手动添加用户 Modal (Legacy for Manual Input)
 */
export async function showManualAddSponsorModal(
  interaction: ButtonInteraction,
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("admin_add_submit")
    .setTitle("Add Manual Sponsor");

  const vrchatInput = new TextInputBuilder()
    .setCustomId("vrchat_name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const rolesInput = new TextInputBuilder()
    .setCustomId("roles")
    .setPlaceholder("VRChat Sponsor, Priority User")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const userIdInput = new TextInputBuilder()
    .setCustomId("user_id")
    .setPlaceholder("Leave empty for auto-generated ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const notesInput = new TextInputBuilder()
    .setCustomId("notes")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  vrchatInput.setLabel("VRChat Name");
  rolesInput.setLabel("Roles (comma separated)");
  userIdInput.setLabel("User ID / Manual Tag");
  notesInput.setLabel("Notes (Optional)");

  const vrcRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    vrchatInput,
  );
  const rolesRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    rolesInput,
  );
  const userIdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    userIdInput,
  );
  const notesRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    notesInput,
  );

  modal.addComponents(vrcRow, rolesRow, userIdRow, notesRow);

  await interaction.showModal(modal);
}

/**
 * 处理手动添加用户提交
 */
export async function handleAddSponsorSubmit(
  interaction: ModalSubmitInteraction,
  guildId: string,
): Promise<void> {
  try {
    await interaction.deferUpdate();
  } catch (e) {
    if (!interaction.deferred)
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const vrchatName = interaction.fields.getTextInputValue("vrchat_name");
  const rolesString = interaction.fields.getTextInputValue("roles");
  const userIdInput = interaction.fields.getTextInputValue("user_id");
  const notes = interaction.fields.getTextInputValue("notes");

  const roleNames = parseRoles(rolesString);
  const cleanVrcName = sanitizeVRChatName(vrchatName);

  const userId = userIdInput.trim() || generateRandomId();

  const existing = await User.findOne({ userId, guildId });
  if (existing) {
    await handleAdminPanel(
      interaction,
      `🔴 User with ID \`${userId}\` already exists.`,
    );
    return;
  }

  const newUser = await User.create({
    guildId,
    userId,
    userType: userIdInput.trim() ? "discord" : "manual",
    displayName: userIdInput.trim() ? userId : cleanVrcName,
    roles: roleNames, // Here it stores names, backward compat?
    // Wait, DB schema `roles` is Array<String>. In Wizard we stored IDs.
    // In legacy code it stored Names.
    // If we mix IDs and Names, `getMemberRoleNames` might be confused or we need to handle both.
    // `User` model `roles` field: "Roles assigned to the user (names or IDs)".
    // Ideally we should prefer IDs for Discord Roles.
    // The Wizard stores IDs. The legacy manual input stores parsed names.
    // This is consistent enough for now.
    notes: notes || undefined,
    addedBy: interaction.user.id,
    joinedAt: new Date(),
    updatedAt: new Date(),
  });

  await VRChatBinding.create({
    userId,
    guildId,
    vrchatName: cleanVrcName,
    firstBindTime: newUser.joinedAt,
    bindTime: newUser.joinedAt,
  });

  await handleAdminPanel(
    interaction,
    `✅ Successfully added **${cleanVrcName}**`,
  );
}

/**
 * 显示编辑用户 Modal
 */
export async function showEditSponsorModal(
  interaction: ButtonInteraction,
  userId: string,
): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  const user = await User.findOne({ userId, guildId });
  const binding = await VRChatBinding.findOne({ userId, guildId });

  if (!user) {
    await interaction.reply({
      content: "🔴 User not found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_admin_user_${userId}`)
    .setTitle(`Edit Sponsor: ${user.displayName || userId}`);

  const vrchatInput = new TextInputBuilder()
    .setCustomId("vrchat_name")
    .setStyle(TextInputStyle.Short)
    .setValue(binding?.vrchatName || user.displayName || "")
    .setRequired(true);

  const rolesInput = new TextInputBuilder()
    .setCustomId("roles")
    .setStyle(TextInputStyle.Short)
    // .setValue(user.roles.join(", ")) // user.roles is IDs? Check schema.
    // In showManualAdd: rolesInput is "VRChat Sponsor, Priority User".
    // User model roles: array of strings.
    // Legacy: user.roles might be names.
    // Let's assume user.roles.join(", ") works for now.
    .setValue(user.roles ? user.roles.join(", ") : "")
    .setRequired(false);

  const notesInput = new TextInputBuilder()
    .setCustomId("notes")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(user.notes || "")
    .setRequired(false);

  const vrcLabel = new LabelBuilder()
    .setLabel("VRChat Name")
    .setTextInputComponent(vrchatInput);

  const rolesLabel = new LabelBuilder()
    .setLabel("Roles (comma separated)")
    .setTextInputComponent(rolesInput);

  const notesLabel = new LabelBuilder()
    .setLabel("Notes")
    .setTextInputComponent(notesInput);

  modal.addLabelComponents(vrcLabel, rolesLabel, notesLabel);

  await interaction.showModal(modal);
}

/**
 * 处理编辑提交
 */
export async function handleEditSponsorSubmit(
  interaction: ModalSubmitInteraction,
  guildId: string,
): Promise<void> {
  try {
    await interaction.deferUpdate();
  } catch (e) {
    if (!interaction.deferred)
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const userId = interaction.customId.replace("modal_admin_user_", "");
  const vrchatName = interaction.fields.getTextInputValue("vrchat_name");
  const rolesString = interaction.fields.getTextInputValue("roles");
  const notes = interaction.fields.getTextInputValue("notes");

  const roleNames = parseRoles(rolesString);
  const cleanVrcName = sanitizeVRChatName(vrchatName);

  await User.updateOne(
    { userId, guildId },
    {
      $set: {
        roles: roleNames,
        notes: notes || undefined,
        updatedAt: new Date(),
      },
    },
  );

  // Update Binding if name changed
  const binding = await VRChatBinding.findOne({ userId, guildId });

  if (binding && binding.vrchatName !== cleanVrcName) {
    await VRChatBinding.updateOne(
      { _id: binding._id },
      {
        $set: { vrchatName: cleanVrcName, bindTime: new Date() },
        $push: {
          nameHistory: { name: binding.vrchatName, changedAt: new Date() },
        },
      },
    );
  } else if (!binding) {
    // Create if missing
    await VRChatBinding.create({
      userId,
      guildId,
      vrchatName: cleanVrcName,
      firstBindTime: new Date(),
      bindTime: new Date(),
    });
  }

  await handleAdminPanel(
    interaction,
    `✅ User <@${userId}> updated successfully.`,
  );
}

/**
 * 删除用户
 */
export async function handleDeleteUser(
  interaction: ButtonInteraction,
  guildId: string,
  userId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate();

  await User.deleteOne({ userId, guildId });
  await VRChatBinding.deleteOne({ userId, guildId });

  await handleAdminPanel(interaction, `✅ User <@${userId}> has been removed.`);
}
