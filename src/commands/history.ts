// /history 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../config/constants';
import VRChatBinding from '../models/VRChatBinding';
import { handleCommandError, requireGuild } from '../utils/errors';

export async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // 查询用户绑定数据
    const vrchatBinding = await VRChatBinding.findOne({ discordUserId: userId, guildId });

    if (!vrchatBinding) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: username,
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE })
        })
        .setTitle('Binding History')
        .setDescription('🔴 No binding found\n\nYou haven\'t bound a VRChat name yet.\nUse `/changename` to create your first binding!')
        .setColor(EMBED_COLORS.ERROR)
        .setThumbnail(interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE }))
        .setFooter({
          text: `${interaction.guild!.name} • User ID: ${userId}`,
          iconURL: interaction.guild!.iconURL({ size: AVATAR_SIZES.SMALL }) || undefined
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // 计算绑定时长
    const bindDays = Math.floor((Date.now() - vrchatBinding.firstBindTime.getTime()) / (1000 * 60 * 60 * 24));
    const totalChanges = (vrchatBinding.nameHistory?.length || 0) + 1; // +1 for current name

    const embed = new EmbedBuilder()
      .setAuthor({
        name: username,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE })
      })
      .setTitle('VRChat Binding History')
      .setDescription(
        `Current Name: ${vrchatBinding.vrchatName}\n` +
        `Total Changes: ${totalChanges}\n` +
        `Bound Since: <t:${Math.floor(vrchatBinding.firstBindTime.getTime() / 1000)}:D> (${bindDays} days)`
      )
      .setColor(EMBED_COLORS.INFO)
      .setThumbnail(interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE }));

    // 添加历史记录
    if (vrchatBinding.nameHistory && vrchatBinding.nameHistory.length > 0) {
      // 按时间倒序排列（最新的在前）
      const sortedHistory = [...vrchatBinding.nameHistory].sort((a, b) => 
        b.changedAt.getTime() - a.changedAt.getTime()
      );

      // 最多显示最近的 10 条记录
      const displayHistory = sortedHistory.slice(0, 10);
      
      let historyText = '';
      displayHistory.forEach((entry, index) => {
        const timestamp = Math.floor(entry.changedAt.getTime() / 1000);
        historyText += `${index + 1}. ${entry.name}\n`;
        historyText += `   <t:${timestamp}:R> • <t:${timestamp}:D>\n\n`;
      });

      embed.addFields({
        name: 'Previous Names',
        value: historyText || 'No history available',
        inline: false
      });

      if (sortedHistory.length > 10) {
        embed.addFields({
          name: '',
          value: `Showing 10 most recent of ${sortedHistory.length} total changes.`,
          inline: false
        });
      }
    } else {
      embed.addFields({
        name: 'Previous Names',
        value: 'No name changes yet\n\nYour history will appear here when you update your VRChat name.',
        inline: false
      });
    }

    // 添加统计信息
    const daysSinceLastChange = Math.floor((Date.now() - vrchatBinding.bindTime.getTime()) / (1000 * 60 * 60 * 24));
    const avgDaysPerChange = totalChanges > 1 ? Math.floor(bindDays / (totalChanges - 1)) : bindDays;

    embed.addFields({
      name: 'Statistics',
      value: 
        `Last Update: <t:${Math.floor(vrchatBinding.bindTime.getTime() / 1000)}:R> (${daysSinceLastChange} days ago)\n` +
        `Avg Time Between Changes: ${avgDaysPerChange} days`,
      inline: false
    });

    embed.setFooter({
      text: `${interaction.guild!.name} • User ID: ${userId}`,
      iconURL: interaction.guild!.iconURL({ size: AVATAR_SIZES.SMALL }) || undefined
    });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
