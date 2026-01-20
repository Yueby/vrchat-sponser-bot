import { ActionRowBuilder, ButtonBuilder, ButtonStyle, User, ChatInputCommandInteraction, UserContextMenuCommandInteraction, ButtonInteraction, EmbedBuilder, RepliableInteraction } from 'discord.js';
import UserProfileModel from '../../models/User';
import VRChatBinding from '../../models/VRChatBinding';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import { getMemberRoleNames } from '../../utils/discord';

/**
 * 显示用户资料卡
 */
export async function handleUserProfile(
  interaction: ChatInputCommandInteraction | ButtonInteraction | UserContextMenuCommandInteraction,
  guildId: string,
  targetUser: User = interaction.user
): Promise<void> {
  const userId = targetUser.id;
  const isSelf = userId === interaction.user.id;
  
  if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  
  const user = await UserProfileModel.findOne({ userId, guildId });
  const binding = await VRChatBinding.findOne({ userId, guildId });
  
  const member = interaction.guild!.members.cache.get(userId);
  const roleNames = member ? getMemberRoleNames(member) : [];
  
  const totalBindings = await VRChatBinding.countDocuments({ guildId });
  const totalUsers = await UserProfileModel.countDocuments({ guildId, userType: 'discord' });
  let rank = 0;
  if (user?.joinedAt) {
    rank = await UserProfileModel.countDocuments({ guildId, joinedAt: { $lt: user.joinedAt } }) + 1;
  }

  const embed = new EmbedBuilder()
    .setAuthor({ 
      name: member?.displayName || targetUser.username,
      iconURL: targetUser.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTitle(isSelf ? 'My Profile' : `${targetUser.username}'s Profile`)
    .setColor(member?.displayColor || EMBED_COLORS.INFO)
    .setThumbnail(targetUser.displayAvatarURL({ size: AVATAR_SIZES.LARGE }))
    .addFields(
      { 
        name: 'VRChat Status', 
        value: binding 
          ? `Name: **${binding.vrchatName}**\nBound: <t:${Math.floor(binding.firstBindTime.getTime() / 1000)}:D>`
          : `🔴 Not bound.${isSelf ? ' Use `/bind` to bind.' : ''}`,
        inline: false 
      },
      { 
        name: 'Membership', 
        value: `Type: ${user?.userType === 'manual' ? 'External' : 'Member'}\nJoined: <t:${Math.floor((user?.joinedAt || member?.joinedAt || new Date()).getTime() / 1000)}:D>`,
        inline: true 
      },
      { 
        name: 'Roles', 
        value: roleNames.length > 0 ? roleNames.join(', ') : 'No roles',
        inline: true 
      },
      {
        name: 'Statistics',
        value: `Server Rank: #${rank || '?'}\nGlobal bindings: ${totalBindings}/${totalUsers}`,
        inline: true
      },
      {
        name: '🔗 Full Profile',
        value: `[View detailed profile online](http://${process.env.DOMAIN || 'localhost'}/dashboard/${guildId}/user/${userId})`,
        inline: false
      }
    )
    .setTimestamp();

  // 只有本人查看时显示“修改”按钮
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (isSelf) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('btn_user_edit')
        .setLabel('Edit Profile')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_user_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
    );
  } else {
    // 别人查看时显示“查看历史”等按钮（可选）
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_user_history_${userId}`)
        .setLabel('View History')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (interaction.isRepliable()) {
    await interaction.editReply({ 
      embeds: [embed],
      components: [row]
    });
  }
}
