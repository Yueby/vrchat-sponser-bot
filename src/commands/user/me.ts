import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import User from '../../models/User';
import VRChatBinding from '../../models/VRChatBinding';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import { getMemberRoleNames } from '../../utils/discord';

/**
 * /user me - 查看个人资料
 */
export async function handleUserMe(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const userId = interaction.user.id;
  
  const user = await User.findOne({ userId, guildId });
  const binding = await VRChatBinding.findOne({ userId, guildId });
  
  const member = interaction.guild!.members.cache.get(userId);
  const roleNames = member ? getMemberRoleNames(member) : [];
  
  const totalBindings = await VRChatBinding.countDocuments({ guildId });
  const totalUsers = await User.countDocuments({ guildId, userType: 'discord' });
  let rank = 0;
  if (user?.joinedAt) {
    rank = await User.countDocuments({ guildId, joinedAt: { $lt: user.joinedAt } }) + 1;
  }

  const embed = new EmbedBuilder()
    .setAuthor({ 
      name: member?.displayName || interaction.user.username,
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
    })
    .setTitle('User Profile')
    .setColor(member?.displayColor || EMBED_COLORS.INFO)
    .setThumbnail(interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE }))
    .addFields(
      { 
        name: 'VRChat Status', 
        value: binding 
          ? `Name: **${binding.vrchatName}**\nBound: <t:${Math.floor(binding.firstBindTime.getTime() / 1000)}:D>`
          : '🔴 Not bound. Use `/user update vrchat_name:` to bind.',
        inline: false 
      },
      { 
        name: 'Membership', 
        value: `Type: ${user?.isBooster ? 'Server Booster' : 'Member'}\nJoined: <t:${Math.floor((user?.joinedAt || member?.joinedAt || new Date()).getTime() / 1000)}:D>`,
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
        inline: false
      },
      {
        name: '🔗 Links',
        value: `[Web Dashboard](http://${process.env.DOMAIN || 'localhost'}/dashboard/${guildId}/${userId})`,
        inline: false
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
