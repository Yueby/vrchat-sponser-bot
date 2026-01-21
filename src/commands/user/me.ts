import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  User, 
  ChatInputCommandInteraction, 
  UserContextMenuCommandInteraction, 
  ButtonInteraction, 
  EmbedBuilder, 
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  MessageFlags,
  RepliableInteraction
} from 'discord.js';
import UserProfileModel from '../../models/User';
import VRChatBinding from '../../models/VRChatBinding';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import { getMemberRoleNames } from '../../utils/discord';
import { handleCommandError } from '../../utils/errors';

/**
 * 主入口：处理 /me 指令
 */
export async function handleUserProfile(
  interaction: RepliableInteraction,
  guildId: string,
  targetUser: User = interaction.user
): Promise<void> {
  const userId = targetUser.id;
  const isSelf = userId === interaction.user.id;
  
  // 确保 defer (如果是首次响应)
  if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  try {
    const user = await UserProfileModel.findOne({ userId, guildId });
    const binding = await VRChatBinding.findOne({ userId, guildId });
    
    // 如果是 ContextMenu 查看别人，且该人无记录
    if (!isSelf && !user && !binding) {
      const msg = `User ${targetUser.username} is not a registered sponsor or has no data.`;
      if (interaction.isRepliable()) await interaction.editReply(msg);
      return;
    }

    const member = interaction.guild!.members.cache.get(userId);
    const roleNames = member ? getMemberRoleNames(member) : [];
    
    // 简化的统计逻辑（避免大查询开销，仅查询自身排名）
    let rankStr = '?';
    if (user?.joinedAt) {
      const count = await UserProfileModel.countDocuments({ guildId, joinedAt: { $lt: user.joinedAt } });
      rankStr = `#${count + 1}`;
    }

    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: member?.displayName || targetUser.username, 
        iconURL: targetUser.displayAvatarURL({ size: AVATAR_SIZES.SMALL }) 
      })
      .setTitle(`${targetUser.username}'s Profile`)
      .setColor(member?.displayColor || EMBED_COLORS.INFO)
      .setThumbnail(targetUser.displayAvatarURL({ size: AVATAR_SIZES.LARGE }))
      .addFields(
        { 
          name: 'VRChat Identity', 
          value: binding 
            ? `**${binding.vrchatName}**\nBound: <t:${Math.floor(binding.firstBindTime.getTime() / 1000)}:R>`
            : `Not bound.${isSelf ? ' Click button below.' : ''}`,
          inline: false 
        },
        { 
          name: 'Sponsor Info', 
          value: `Type: ${user?.userType === 'manual' ? 'External' : 'Discord Member'}\nJoined: <t:${Math.floor((user?.joinedAt || member?.joinedAt || new Date()).getTime() / 1000)}:D>`,
          inline: true 
        },
        { 
          name: 'Server Rank', 
          value: rankStr,
          inline: true 
        },
        { 
          name: 'Role Groups', 
          value: roleNames.length > 0 ? roleNames.join(', ') : 'None',
          inline: false 
        }
      )
      .setTimestamp();

    // 构建按钮行
    const row = new ActionRowBuilder<ButtonBuilder>();
    
    if (isSelf) {
      // 本人视角：绑定/编辑，刷新
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('me_bind_modal_open')
          .setLabel(binding ? 'Edit Binding' : 'Bind VRChat')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('me_view_history')
          .setLabel('Name History')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('me_refresh')
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Secondary)
      );
    } else {
      // 他人视角：只能查看历史（如果有权限等，暂只给 History）
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`me_view_history_${userId}`) // 携带目标 ID
          .setLabel('View Name History')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 处理 Modal 显示 (Bind)
 */
export async function showBindModal(interaction: ButtonInteraction, guildId: string): Promise<void> {
  const binding = await VRChatBinding.findOne({ userId: interaction.user.id, guildId });
  const user = await UserProfileModel.findOne({ userId: interaction.user.id, guildId });

  const modal = new ModalBuilder()
    .setCustomId('me_bind_submit')
    .setTitle('Update Profile');

  const nameInput = new TextInputBuilder()
    .setCustomId('vrchat_name')
    .setLabel('VRChat Display Name')
    .setPlaceholder('Enter exact name (case sensitive)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(binding?.vrchatName || '');

  const avatarInput = new TextInputBuilder()
    .setCustomId('avatar_url')
    .setLabel('Custom Avatar URL (Optional)')
    .setPlaceholder('https://...')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(user?.avatarUrl || '');

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(avatarInput)
  );
  
  await interaction.showModal(modal);
}

/**
 * 处理 Modal 提交 (Bind Logic)
 */
export async function handleMeModalSubmit(interaction: ModalSubmitInteraction, guildId: string): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  const vrchatName = interaction.fields.getTextInputValue('vrchat_name');
  const avatarUrl = interaction.fields.getTextInputValue('avatar_url');
  const userId = interaction.user.id;

  if (!vrchatName && !avatarUrl) {
    await interaction.editReply('🔴 Please provide at least a name or an avatar URL.');
    return;
  }

  try {
    const member = interaction.guild?.members.cache.get(userId);

    // 1. 确保 User 记录存在并更新 Avatar
    if (avatarUrl && !/^https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)(?:\?.*)?$/i.test(avatarUrl)) {
      await interaction.editReply('🔴 Invalid avatar URL format.');
      return;
    }

    let user = await UserProfileModel.findOne({ userId, guildId });
    if (!user) {
      user = new UserProfileModel({
        userId,
        guildId,
        userType: 'discord',
        joinedAt: member?.joinedAt || new Date(),
        roles: [],
        username: interaction.user.username,
        displayName: member?.displayName
      });
    }

    if (avatarUrl) user.avatarUrl = avatarUrl;
    await user.save();

    // 2. 处理 VRChat Name
    if (vrchatName) {
      let binding = await VRChatBinding.findOne({ userId, guildId });

      if (binding) {
        // 更新逻辑
        const oldName = binding.vrchatName;
        if (oldName !== vrchatName) {
          binding.vrchatName = vrchatName;
          // @ts-ignore
          binding.nameHistory.push({ name: oldName, changedAt: new Date() });
          binding.bindTime = new Date();
          await binding.save();
        }
      } else {
        // 新建逻辑
        binding = new VRChatBinding({
          userId,
          guildId,
          vrchatName,
          firstBindTime: new Date(),
          bindTime: new Date(),
          nameHistory: []
        });
        await binding.save();
      }
    }

    // 成功后直接显示 Profile (不仅是成功消息，而是刷新界面)
    // @ts-ignore
    await handleUserProfile(interaction, guildId);
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}

/**
 * 显示历史记录
 */
export async function handleViewHistory(interaction: ButtonInteraction, guildId: string, targetUserId?: string): Promise<void> {
  const userId = targetUserId || interaction.user.id;
  await interaction.deferUpdate(); // 原地更新，不发新消息

  const binding = await VRChatBinding.findOne({ userId, guildId });
  const history = binding?.nameHistory || [];

  if (history.length === 0) {
    await interaction.followUp({ content: 'No name change history found.', flags: MessageFlags.Ephemeral });
    return;
  }

  // 倒序排列
  const sortedHistory = [...history].reverse().slice(0, 10);
  const desc = sortedHistory.map((h, i) => 
    `\`${h.name}\` • <t:${Math.floor(h.changedAt.getTime() / 1000)}:d>`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('VRChat Name History')
    .setDescription(desc || 'No history recorded.')
    .setColor(EMBED_COLORS.INFO)
    .setFooter({ text: 'Displaying last 10 changes' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('me_back_profile') // 返回按钮
      .setLabel('Back to Profile')
      .setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
}
