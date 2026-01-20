import { ActionRowBuilder, Interaction, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, UserContextMenuCommandInteraction, ButtonStyle, ButtonBuilder, EmbedBuilder, ButtonInteraction, ModalSubmitInteraction, AutocompleteInteraction, ChatInputCommandInteraction, User as DiscordUser } from 'discord.js';
import { handleUserProfile } from '../commands/user/me';
import { handleUserUpdate } from '../commands/user/update';
import { handleAdminSyncCommand } from '../commands/server/sync';
import { handleAdminApiCommand } from '../commands/server/api';
import { handleServerNotify } from '../commands/server/notify';
import { handleServerSettings } from '../commands/server/settings';
import { handleAdminUserDelete, handleAdminUserUpdate } from '../commands/admin/user';
import UserModel from '../models/User';
import VRChatBinding from '../models/VRChatBinding';
import { requireAdmin, requireGuild } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * 统一处理所有交互 (按钮, 模态框, 上下文菜单)
 */
export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      // 交由现有的 commandHandler 处理（稍后可统一合并）
      return;
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalInteraction(interaction);
    } else if (interaction.isUserContextMenuCommand()) {
      await handleUserContextMenuInteraction(interaction);
    } else if (interaction.isAutocomplete()) {
      await handleAutocompleteInteraction(interaction);
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

  if (customId === 'btn_user_edit') {
    await showBindModal(interaction);
  } else if (customId === 'btn_user_refresh') {
    await handleUserProfile(interaction, guildId);
  } else if (customId.startsWith('btn_server_')) {
    if (!requireAdmin(interaction)) return;
    
    if (customId === 'btn_server_sync_now') {
      await handleAdminSyncCommand(interaction, 'now');
      // 这里的 sync 是异步的，刷新面板可以显示“同步中”状态
      await handleServerSettings(interaction, '✅ Manual synchronization has been triggered.');
    } else if (customId === 'btn_server_api_toggle') {
      await handleAdminApiCommand(interaction, 'toggle');
      await handleServerSettings(interaction, '✅ Web API access has been toggled.');
    } else if (customId === 'btn_server_api_getkey') {
      await handleAdminApiCommand(interaction, 'status');
    } else if (customId === 'btn_server_notify_edit') {
      await showNotifyModal(interaction);
    }
  } else if (customId.startsWith('btn_admin_edit_')) {
    if (!requireAdmin(interaction)) return;
    const userId = customId.replace('btn_admin_edit_', '');
    await showAdminEditModal(interaction, userId);
  } else if (customId.startsWith('btn_admin_remove_')) {
    if (!requireAdmin(interaction)) return;
    const userId = customId.replace('btn_admin_remove_', '');
    await handleAdminUserDelete(interaction, guildId, userId);
  }
}

/**
 * 设置通知用户的模态框
 */
async function showNotifyModal(interaction: ButtonInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId('modal_server_notify')
    .setTitle('Set Notification Recipient');

  const input = new TextInputBuilder()
    .setCustomId('user_id')
    .setLabel('Discord User ID')
    .setPlaceholder('1234567890...')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  await interaction.showModal(modal);
}

/**
 * 显示绑定模态框 (内部复用)
 */
export async function showBindModal(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId('modal_user_bind')
    .setTitle('Bind VRChat Account');

  const nameInput = new TextInputBuilder()
    .setCustomId('vrchat_name')
    .setLabel('VRChat Name')
    .setPlaceholder('Enter your exact VRChat display name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const avatarInput = new TextInputBuilder()
    .setCustomId('avatar_url')
    .setLabel('Custom Avatar URL (Optional)')
    .setPlaceholder('https://example.com/image.png')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(avatarInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);
}


/**
 * 处理模态框提交
 */
async function handleModalInteraction(interaction: ModalSubmitInteraction): Promise<void> {
  const { customId } = interaction;
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (customId === 'modal_user_bind') {
    const vrchatName = interaction.fields.getTextInputValue('vrchat_name');
    const avatarUrl = interaction.fields.getTextInputValue('avatar_url');
    await handleUserUpdate(interaction, guildId, vrchatName, avatarUrl);
  } else if (customId === 'modal_server_notify') {
    const userId = interaction.fields.getTextInputValue('user_id');
    await handleServerNotify(interaction, userId);
  } else if (customId.startsWith('modal_admin_user_')) {
    const userId = customId.replace('modal_admin_user_', '');
    const vrchatName = interaction.fields.getTextInputValue('vrchat_name');
    const roles = interaction.fields.getTextInputValue('roles');
    const externalName = interaction.fields.getTextInputValue('external_name');
    const notes = interaction.fields.getTextInputValue('notes');
    
    await handleAdminUserUpdate(interaction, guildId, {
      userId,
      vrchatName,
      roles,
      externalName,
      notes
    });
  }
}

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


/**
 * 显示管理员编辑用户模态框
 */
async function showAdminEditModal(interaction: ButtonInteraction, userId: string): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const user = await UserModel.findOne({ userId, guildId });
  if (!user) {
    await interaction.reply({ content: '🔴 User not found.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_admin_user_${userId}`)
    .setTitle(`Edit Sponsor: ${user.displayName || userId}`);

  const nameInput = new TextInputBuilder()
    .setCustomId('vrchat_name')
    .setLabel('VRChat Name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const rolesInput = new TextInputBuilder()
    .setCustomId('roles')
    .setLabel('Roles (comma separated)')
    .setPlaceholder('e.g. VIP, Sponsor')
    .setStyle(TextInputStyle.Short)
    .setValue(user.roles.join(', ') || '')
    .setRequired(false);

  const externalNameInput = new TextInputBuilder()
    .setCustomId('external_name')
    .setLabel('Display Name (Optional Override)')
    .setStyle(TextInputStyle.Short)
    .setValue(user.displayName || '')
    .setRequired(false);

  const notesInput = new TextInputBuilder()
    .setCustomId('notes')
    .setLabel('Notes')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(user.notes || '')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(rolesInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(externalNameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
  );

  await interaction.showModal(modal);
}

/**
 * 处理自动补全
 */
async function handleAutocompleteInteraction(interaction: AutocompleteInteraction): Promise<void> {
  const focusedOption = interaction.options.getFocused(true);
  const guildId = interaction.guildId;
  if (!guildId) return;

  const value = focusedOption.value;
  if (!value && focusedOption.name === 'value') {
    await interaction.respond([]);
    return;
  }

  try {
    if (focusedOption.name === 'user_id') {
      // 搜索用户 ID 或显示名
      const users = await UserModel.find({
        guildId,
        $or: [
          { userId: { $regex: value, $options: 'i' } },
          { displayName: { $regex: value, $options: 'i' } }
        ]
      }).limit(25);

      await interaction.respond(
        users.map(u => ({
          name: `${u.displayName || 'Unknown'} (${u.userId})`,
          value: u.userId
        }))
      );
    } else if (focusedOption.name === 'value') {
      const searchType = interaction.options.getString('type');
      
      if (searchType === 'vrchat') {
        const bindings = await VRChatBinding.find({
          guildId,
          vrchatName: { $regex: value, $options: 'i' }
        }).limit(25);
        
        await interaction.respond(
          bindings.map(b => ({ name: b.vrchatName, value: b.vrchatName }))
        );
      } else if (searchType === 'discord') {
        const users = await UserModel.find({
          guildId,
          userId: { $regex: value, $options: 'i' }
        }).limit(25);
        
        await interaction.respond(
          users.map(u => ({ name: `${u.displayName || u.userId} (${u.userId})`, value: u.userId }))
        );
      } else if (searchType === 'role') {
        // 搜索角色名（从 User 集合中的 roles 数组去重获取）
        const roles = await UserModel.distinct('roles', { guildId, roles: { $regex: value, $options: 'i' } });
        await interaction.respond(
          roles.slice(0, 25).map(r => ({ name: r, value: r }))
        );
      }
    }
  } catch (error) {
    logger.error('Autocomplete Error:', error);
    await interaction.respond([]);
  }
}
