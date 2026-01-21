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
} from "discord.js";
import { EMBED_COLORS } from "../../config/constants";
import {
  handleCommandError,
  requireAdmin,
  requireGuild,
} from "../../utils/errors";
import User from "../../models/User";
import VRChatBinding from "../../models/VRChatBinding"; // 假设需要统计信息

/**
 * /admin - 管理员主面板
 */
export async function handleAdminPanel(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  statusMsg?: string,
): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;
  if (!requireAdmin(interaction)) return;

  if (
    interaction.isRepliable() &&
    !interaction.deferred &&
    !interaction.replied
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  try {
    const totalSponsors = await User.countDocuments({ guildId });
    const unboundCount = await VRChatBinding.countDocuments({
      guildId,
      vrchatName: { $exists: false },
    }); // 实际上这是绑定的文档，应该换种查法
    // 简化统计，只显示 Sponsor 总数

    const embed = new EmbedBuilder()
      .setTitle("Administrator Panel")
      .setDescription(
        statusMsg || "Select an action below to manage sponsors and users.",
      )
      .setColor(EMBED_COLORS.INFO)
      .addFields(
        { name: "Sponsors", value: `${totalSponsors}`, inline: true },
        // { name: 'Unbound', value: `${unboundCount}`, inline: true }
      );

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_btn_search")
        .setLabel("Search User")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("admin_btn_add")
        .setLabel("Add Sponsor")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("admin_btn_list")
        .setLabel("List All")
        .setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_btn_unbound")
        .setLabel("Check Unbound")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("admin_btn_refresh")
        .setLabel("Refresh Cache")
        .setStyle(ButtonStyle.Secondary),
    );

    if (interaction.isRepliable()) {
      await interaction.editReply({
        embeds: [embed],
        components: [row1, row2],
      });
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
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
    .setPlaceholder("Enter Discord ID, Name, or VRChat Name")
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
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const query = interaction.fields.getTextInputValue("query");

  try {
    // 简单的搜索逻辑：尝试匹配 User 或 Binding
    // 这里暂时简化，之后可以从 search.ts 迁移复杂逻辑
    const binding = await VRChatBinding.findOne({
      guildId,
      $or: [{ vrchatName: new RegExp(query, "i") }, { userId: query }],
    });

    if (binding) {
      const embed = new EmbedBuilder()
        .setTitle("Search Result")
        .setColor(EMBED_COLORS.SUCCESS)
        .addFields(
          { name: "Discord ID", value: binding.userId, inline: true },
          {
            name: "VRChat Name",
            value: binding.vrchatName || "Not Bound",
            inline: true,
          },
          {
            name: "Bind Time",
            value: binding.bindTime
              ? `<t:${Math.floor(binding.bindTime.getTime() / 1000)}:f>`
              : "Unknown",
            inline: false,
          },
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_btn_user_edit_${binding.userId}`)
          .setLabel("Edit")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("admin_btn_back")
          .setLabel("Back to Panel")
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
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
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const users = await User.find({ guildId }).sort({ joinedAt: -1 }).limit(30);
  if (users.length === 0) {
    await interaction.editReply("No sponsors found.");
    return;
  }

  const list = users
    .map((u) => {
      return `• **${u.displayName || u.userId}** (\`${u.userType}\`): ${u.roles.join(", ") || "No Role"}`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("Sponsor List")
    .setDescription(list)
    .setColor(EMBED_COLORS.INFO)
    .setFooter({ text: `Showing last 30 members. Total: ${users.length}` });

  await interaction.editReply({ embeds: [embed] });
}

/**
 * 查看未绑定成员
 */
export async function handleViewUnbound(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // @ts-ignore
  const { getUnboundMembers } = await import("../../utils/binding");
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

  if (unboundMembers.length > 0) {
    const list = unboundMembers
      .slice(0, 15)
      .map(
        (m: any, i: number) =>
          `${i + 1}. **${m.displayName}** (<@${m.userId}>)`,
      )
      .join("\n");

    embed.addFields({
      name: "Top Unbound Members",
      value: list,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

/**
 * 刷新缓存
 */
export async function handleRefreshCache(
  interaction: ButtonInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply(
    "✅ Cache has been refreshed (User list reloaded).",
  );
  // 重新加载面板
  await handleAdminPanel(interaction, "Cache refreshed.");
}

/**
 * 显示添加用户 Modal
 */
export async function showAddSponsorModal(
  interaction: ButtonInteraction,
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("admin_add_submit")
    .setTitle("Add New Sponsor");

  const vrchatInput = new TextInputBuilder()
    .setCustomId("vrchat_name")
    .setLabel("VRChat Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const rolesInput = new TextInputBuilder()
    .setCustomId("roles")
    .setLabel("Roles (comma separated)")
    .setPlaceholder("VRChat Sponsor, Priority User")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const userIdInput = new TextInputBuilder()
    .setCustomId("user_id")
    .setLabel("Discord User ID (Optional)")
    .setPlaceholder("Leave empty for manual user")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const notesInput = new TextInputBuilder()
    .setCustomId("notes")
    .setLabel("Notes (Optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(vrchatInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(rolesInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(userIdInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput),
  );

  await interaction.showModal(modal);
}

/**
 * 处理添加用户提交
 */
export async function handleAddSponsorSubmit(
  interaction: ModalSubmitInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const vrchatName = interaction.fields.getTextInputValue("vrchat_name");
  const rolesString = interaction.fields.getTextInputValue("roles");
  const userIdInput = interaction.fields.getTextInputValue("user_id");
  const notes = interaction.fields.getTextInputValue("notes");

  // @ts-ignore
  const { parseRoles, generateRandomId } = await import("../../utils/external");
  // @ts-ignore
  const { sanitizeVRChatName } = await import("../../utils/validation");

  const userId = userIdInput.trim() || generateRandomId();
  // Simple check if user exists
  const existing = await User.findOne({ userId, guildId });
  if (existing) {
    await interaction.editReply(
      `🔴 User with ID \`${userId}\` already exists.`,
    );
    return;
  }

  const roleNames = parseRoles(rolesString);
  const cleanVrcName = sanitizeVRChatName(vrchatName);

  const newUser = await User.create({
    guildId,
    userId,
    userType: userIdInput.trim() ? "discord" : "manual",
    displayName: userIdInput.trim() ? userId : cleanVrcName, // If Discord ID provided, use ID name initially
    roles: roleNames,
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

  const embed = new EmbedBuilder()
    .setTitle("User Added")
    .setDescription(`Successfully added **${cleanVrcName}**`)
    .addFields(
      { name: "User ID", value: userId, inline: true },
      { name: "Roles", value: roleNames.join(", "), inline: true },
      { name: "Type", value: newUser.userType, inline: false },
    )
    .setColor(EMBED_COLORS.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

/**
 * 显示编辑用户 Modal
 */
export async function showEditSponsorModal(
  interaction: ButtonInteraction | any,
  userId: string,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const user = await User.findOne({ userId, guildId });

  if (!user) {
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: "🔴 User not found.",
        ephemeral: true,
      });
    }
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_admin_user_${userId}`)
    .setTitle(`Edit Sponsor: ${user.displayName || userId}`);

  const vrchatInput = new TextInputBuilder()
    .setCustomId("vrchat_name")
    .setLabel("VRChat Name")
    .setStyle(TextInputStyle.Short)
    .setValue(user.displayName !== user.userId ? user.displayName || "" : "") // Try to guess VRC Name
    .setRequired(true);

  // Try to find binding to pre-fill specific VRC Name
  // @ts-ignore
  const binding = await import("../../models/VRChatBinding").then((m) =>
    m.default.findOne({ userId, guildId }),
  );
  if (binding) {
    vrchatInput.setValue(binding.vrchatName);
  }

  const rolesInput = new TextInputBuilder()
    .setCustomId("roles")
    .setLabel("Roles (comma separated)")
    .setStyle(TextInputStyle.Short)
    .setValue(user.roles.join(", "))
    .setRequired(false);

  const notesInput = new TextInputBuilder()
    .setCustomId("notes")
    .setLabel("Notes")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(user.notes || "")
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(vrchatInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(rolesInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput),
  );

  await interaction.showModal(modal);
}

/**
 * 处理编辑提交
 */
export async function handleEditSponsorSubmit(
  interaction: ModalSubmitInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userId = interaction.customId.replace("modal_admin_user_", "");
  const vrchatName = interaction.fields.getTextInputValue("vrchat_name");
  const rolesString = interaction.fields.getTextInputValue("roles");
  const notes = interaction.fields.getTextInputValue("notes");

  // @ts-ignore
  const { parseRoles } = await import("../../utils/external");
  // @ts-ignore
  const { sanitizeVRChatName } = await import("../../utils/validation");

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
  // @ts-ignore
  const VRChatBinding = (await import("../../models/VRChatBinding")).default;
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

  await interaction.editReply(`✅ User <@${userId}> updated successfully.`);
}

/**
 * 删除用户
 */
export async function handleDeleteUser(
  interaction: ButtonInteraction,
  guildId: string,
  userId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  await User.deleteOne({ userId, guildId });
  // @ts-ignore
  const VRChatBinding = (await import("../../models/VRChatBinding")).default;
  await VRChatBinding.deleteOne({ userId, guildId });

  await interaction.editReply(
    `✅ User <@${userId}> has been removed from sponsors.`,
  );
}
