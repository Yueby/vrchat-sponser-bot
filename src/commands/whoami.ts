// /whoami 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../config/constants';
import DiscordUser from '../models/DiscordUser';
import ExternalUser from '../models/ExternalUser';
import VRChatBinding from '../models/VRChatBinding';
import { getMemberRoleNames } from '../utils/discord';
import { handleCommandError, requireGuild } from '../utils/errors';

export async function handleWhoAmI(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // 查询用户数据
    const discordUser = await DiscordUser.findOne({ userId, guildId });
    const vrchatBinding = await VRChatBinding.findOne({ discordUserId: userId, guildId });
    const externalUser = await ExternalUser.findOne({ $or: [{ discordUserId: userId }, { vrchatName: vrchatBinding?.vrchatName }], guildId });

    const member = interaction.guild!.members.cache.get(userId);
    const roleNames = member ? getMemberRoleNames(member) : [];

    // 计算支持天数
    const supportDays = discordUser?.joinedAt 
      ? Math.floor((Date.now() - discordUser.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // 计算绑定时长
    const bindDays = vrchatBinding?.firstBindTime
      ? Math.floor((Date.now() - vrchatBinding.firstBindTime.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // 计算加入排名（在服务器中的位置）
    let memberRank = 0;
    if (discordUser?.joinedAt) {
      memberRank = await DiscordUser.countDocuments({
        guildId,
        joinedAt: { $lt: discordUser.joinedAt }
      }) + 1;
    }

    // 统计总绑定数和总成员数
    const totalBindings = await VRChatBinding.countDocuments({ guildId });
    const totalMembers = await DiscordUser.countDocuments({ guildId });

    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: `${member?.displayName || username}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE })
      })
      .setTitle('Your Profile')
      .setColor(member?.displayColor || EMBED_COLORS.INFO)
      .setThumbnail(interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE }))
      .addFields(
        { 
          name: 'VRChat Information', 
          value: vrchatBinding 
            ? `Name: ${vrchatBinding.vrchatName}\n` +
              `Bound Since: <t:${Math.floor(vrchatBinding.firstBindTime.getTime() / 1000)}:D> (${bindDays} days)\n` +
              `Last Update: <t:${Math.floor(vrchatBinding.bindTime.getTime() / 1000)}:R>` +
              (externalUser ? '\nAlso in external list' : '')
            : '🔴 Not bound\nUse `/changename` to bind your VRChat name',
          inline: false 
        },
        { 
          name: 'Server Roles', 
          value: roleNames.length > 0 
            ? `${roleNames.map(role => `• ${role}`).join('\n')}\nTotal: ${roleNames.length} role${roleNames.length !== 1 ? 's' : ''}`
            : 'No roles',
          inline: true 
        },
        { 
          name: 'Membership Info', 
          value: 
            `${discordUser?.isBooster ? 'Server Booster' : 'Member'}\n` +
            `Joined: ${discordUser?.joinedAt ? `<t:${Math.floor(discordUser.joinedAt.getTime() / 1000)}:D>` : 'Unknown'}\n` +
            `Support Days: ${supportDays} days` +
            (memberRank > 0 ? `\nJoin Rank: #${memberRank} of ${totalMembers}` : ''),
          inline: true 
        },
        {
          name: 'Server Statistics',
          value: 
            `Bindings: ${totalBindings}/${totalMembers} members\n` +
            `Bind Rate: ${totalMembers > 0 ? ((totalBindings / totalMembers) * 100).toFixed(1) : '0'}%` +
            (vrchatBinding ? '\n🟢 You are bound' : '\n🟡 You are not bound'),
          inline: false
        }
      )
      .setFooter({ 
        text: `${interaction.guild!.name} • User ID: ${userId}`,
        iconURL: interaction.guild!.iconURL({ size: AVATAR_SIZES.SMALL }) || undefined
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
