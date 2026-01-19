import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import VRChatBinding from '../../models/VRChatBinding';

/**
 * /user history - 查看 VRChat 名字变更历史
 */
export async function handleUserHistory(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const userId = interaction.user.id;
  const vrchatBinding = await VRChatBinding.findOne({ userId, guildId });

  if (!vrchatBinding) {
    await interaction.editReply('🔴 No binding found. Use `/user update vrchat_name:` to bind.');
    return;
  }

  const bindDays = Math.floor((Date.now() - vrchatBinding.firstBindTime.getTime()) / (1000 * 60 * 60 * 24));
  const totalChanges = (vrchatBinding.nameHistory?.length || 0) + 1;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE })
    })
    .setTitle('VRChat Binding History')
    .setDescription(
      `Current Name: **${vrchatBinding.vrchatName}**\n` +
      `Total Changes: ${totalChanges}\n` +
      `Bound Since: <t:${Math.floor(vrchatBinding.firstBindTime.getTime() / 1000)}:D> (${bindDays} days)`
    )
    .setColor(EMBED_COLORS.INFO)
    .setThumbnail(interaction.user.displayAvatarURL({ size: AVATAR_SIZES.LARGE }));

  if (vrchatBinding.nameHistory && vrchatBinding.nameHistory.length > 0) {
    const displayHistory = [...vrchatBinding.nameHistory]
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
      .slice(0, 10);
    
    let historyText = '';
    displayHistory.forEach((entry, index) => {
      historyText += `${index + 1}. ${entry.name} (<t:${Math.floor(entry.changedAt.getTime() / 1000)}:R>)\n`;
    });

    embed.addFields({ name: 'Previous Names', value: historyText });
  }

  await interaction.editReply({ embeds: [embed] });
}
