import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { client } from '../../bot';
import { EMBED_COLORS } from '../../config/constants';
import User from '../../models/User';
import VRChatBinding from '../../models/VRChatBinding';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';

/**
 * /admin search - 全场景统一搜索
 */
export async function handleAdminSearchCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;
  if (!requireAdmin(interaction)) return;

  const searchType = interaction.options.getString('type', true);
  const searchValue = interaction.options.getString('value', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    let results: any[] = [];

    switch (searchType) {
      case 'vrchat': {
        // 1. 通过绑定表搜索 VRChat 名
        const bindings = await VRChatBinding.find({
          guildId,
          vrchatName: { $regex: searchValue, $options: 'i' }
        }).limit(10).lean();
        
        const userIds = bindings.map(b => b.userId);
        const users = await User.find({ userId: { $in: userIds }, guildId }).lean();
        const userMap = new Map(users.map(u => [u.userId, u]));

        results = bindings.map(b => ({
          binding: b,
          user: userMap.get(b.userId)
        })).filter(r => !!r.user);
        break;
      }

      case 'discord': {
        // 2. 通过 userId 直接搜索
        const user = await User.findOne({ userId: searchValue, guildId }).lean();
        const binding = await VRChatBinding.findOne({ userId: searchValue, guildId }).lean();
        if (user && binding) results.push({ user, binding });
        break;
      }

      case 'role': {
        // 3. 按角色搜索 (同时匹配 Discord ID 和 虚拟名)
        const users = await User.find({
          guildId,
          roles: { $regex: searchValue, $options: 'i' } // 简单的正则匹配角色名/ID
        }).limit(20).lean();
        
        const userIds = users.map(u => u.userId);
        const bindings = await VRChatBinding.find({ userId: { $in: userIds }, guildId }).lean();
        const bindingMap = new Map(bindings.map(b => [b.userId, b]));

        results = users.map(u => ({
          user: u,
          binding: bindingMap.get(u.userId)
        })).filter(r => !!r.binding);
        break;
      }
    }

    if (results.length === 0) {
      await interaction.editReply(`🔴 No sponsors found matching **${searchValue}**.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Search Results (${searchType})`)
      .setColor(EMBED_COLORS.SUCCESS)
      .setTimestamp();

    results.slice(0, 10).forEach((res, i) => {
      const u = res.user;
      const b = res.binding;
      const discordUser = client.users.cache.get(u.userId);
      
      let info = `VRChat: **${b.vrchatName}**\n`;
      info += `Type: ${u.userType} | ID: \`${u.userId}\`\n`;
      if (u.userType === 'discord') info += `Discord: <@${u.userId}> (${discordUser?.username || 'Unknown'})\n`;
      info += `Roles: ${u.roles.join(', ')}\n`;
      info += `Joined: <t:${Math.floor(u.joinedAt.getTime() / 1000)}:R>`;

      embed.addFields({
        name: `${i + 1}. ${u.displayName || u.userId}`,
        value: info,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
