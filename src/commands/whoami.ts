// /whoami 命令处理
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../config/constants';
import DiscordUser from '../models/DiscordUser';
import VRChatBinding from '../models/VRChatBinding';
import { getMemberRoleNames } from '../utils/discord';
import { handleCommandError, requireGuild } from '../utils/errors';

export async function handleWhoAmI(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // 查询用户数据
    const discordUser = await DiscordUser.findOne({ userId, guildId });
    const vrchatBinding = await VRChatBinding.findOne({ discordUserId: userId, guildId });

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

    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: `${member?.displayName || username}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE })
      })
      .setTitle('👤 Your Profile Information')
      .setDescription(
        `**Discord:** ${username}\n` +
        `**User ID:** \`${userId}\``
      )
      .setColor(member?.displayColor || EMBED_COLORS.INFO)
      .setThumbnail(interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE }))
      .addFields(
        { 
          name: '🎮 VRChat Information', 
          value: vrchatBinding 
            ? `**Name:** ${vrchatBinding.vrchatName}\n` +
              `**Bound Since:** <t:${Math.floor(vrchatBinding.firstBindTime.getTime() / 1000)}:D> (${bindDays} days)\n` +
              `**Last Update:** <t:${Math.floor(vrchatBinding.bindTime.getTime() / 1000)}:R>`
            : '❌ **Not bound**\n*Use `/changename` to bind your VRChat name*',
          inline: false 
        },
        { 
          name: '🎭 Server Roles', 
          value: roleNames.length > 0 
            ? roleNames.map(role => `• ${role}`).join('\n')
            : 'No roles',
          inline: true 
        },
        { 
          name: '📊 Membership Info', 
          value: 
            `${discordUser?.isBooster ? '💎' : '👤'} ${discordUser?.isBooster ? '**Server Booster**' : 'Member'}\n` +
            `📅 **Joined:** ${discordUser?.joinedAt ? `<t:${Math.floor(discordUser.joinedAt.getTime() / 1000)}:D>` : 'Unknown'}\n` +
            `⏱️ **Support Days:** ${supportDays} days`,
          inline: true 
        }
      )
      .setFooter({ 
        text: `Member of ${interaction.guild!.name}`,
        iconURL: interaction.guild!.iconURL({ size: AVATAR_SIZES.SMALL }) || undefined
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
