// /admin search 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { client } from '../../bot';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import DiscordUser from '../../models/DiscordUser';
import ExternalUser from '../../models/ExternalUser';
import VRChatBinding from '../../models/VRChatBinding';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';

/**
 * /admin search - 搜索用户
 */
export async function handleAdminSearch(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  if (!requireAdmin(interaction)) return;

  const searchType = interaction.options.getString('type', true);
  const searchValue = interaction.options.getString('value', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    let results: Array<{
      type: 'member' | 'external';
      vrchatName?: string;
      discordUserId?: string;
      discordUsername?: string;
      roles?: string[];
      bindTime?: Date;
      addedAt?: Date;
    }> = [];

    switch (searchType) {
      case 'vrchat': {
        // 按 VRChat 名称搜索（支持部分匹配）
        const bindings = await VRChatBinding.find({
          guildId,
          vrchatName: { $regex: searchValue, $options: 'i' }
        }).limit(10).lean();

        const externalUsers = await ExternalUser.find({
          guildId,
          vrchatName: { $regex: searchValue, $options: 'i' }
        }).limit(10).lean();

        for (const binding of bindings) {
          const user = client.users.cache.get(binding.discordUserId);
          results.push({
            type: 'member',
            vrchatName: binding.vrchatName,
            discordUserId: binding.discordUserId,
            discordUsername: user?.username || 'Unknown',
            bindTime: binding.bindTime
          });
        }

        for (const external of externalUsers) {
          const user = external.discordUserId ? client.users.cache.get(external.discordUserId) : undefined;
          results.push({
            type: 'external',
            vrchatName: external.vrchatName,
            discordUserId: external.discordUserId,
            discordUsername: user?.username,
            roles: external.virtualRoles,
            addedAt: external.addedAt
          });
        }
        break;
      }

      case 'discord': {
        // 按 Discord ID 搜索（精确匹配）
        const binding = await VRChatBinding.findOne({
          guildId,
          discordUserId: searchValue
        }).lean();

        const externalUser = await ExternalUser.findOne({
          guildId,
          discordUserId: searchValue
        }).lean();

        const user = client.users.cache.get(searchValue);

        if (binding) {
          results.push({
            type: 'member',
            vrchatName: binding.vrchatName,
            discordUserId: binding.discordUserId,
            discordUsername: user?.username || 'Unknown',
            bindTime: binding.bindTime
          });
        }

        if (externalUser) {
          results.push({
            type: 'external',
            vrchatName: externalUser.vrchatName,
            discordUserId: externalUser.discordUserId,
            discordUsername: user?.username,
            roles: externalUser.virtualRoles,
            addedAt: externalUser.addedAt
          });
        }
        break;
      }

      case 'role': {
        // 按角色搜索
        const discordGuild = client.guilds.cache.get(guildId);
        if (!discordGuild) {
          await interaction.editReply('❌ Guild not found in cache');
          return;
        }

        // 查找角色
        const role = discordGuild.roles.cache.find(r => 
          r.name.toLowerCase().includes(searchValue.toLowerCase())
        );

        if (!role) {
          await interaction.editReply(`❌ Role **${searchValue}** not found in this server.`);
          return;
        }

        // 查找拥有该角色的用户
        const discordUsers = await DiscordUser.find({
          guildId,
          roles: role.id
        }).limit(20).lean();

        for (const discordUser of discordUsers) {
          const binding = await VRChatBinding.findOne({
            guildId,
            discordUserId: discordUser.userId
          }).lean();

          const user = client.users.cache.get(discordUser.userId);

          if (binding) {
            results.push({
              type: 'member',
              vrchatName: binding.vrchatName,
              discordUserId: discordUser.userId,
              discordUsername: user?.username || 'Unknown',
              roles: discordUser.roles,
              bindTime: binding.bindTime
            });
          }
        }

        // 也搜索外部用户
        const externalUsers = await ExternalUser.find({
          guildId,
          virtualRoles: role.name
        }).limit(20).lean();

        for (const external of externalUsers) {
          const user = external.discordUserId ? client.users.cache.get(external.discordUserId) : undefined;
          results.push({
            type: 'external',
            vrchatName: external.vrchatName,
            discordUserId: external.discordUserId,
            discordUsername: user?.username,
            roles: external.virtualRoles,
            addedAt: external.addedAt
          });
        }
        break;
      }
    }

    if (results.length === 0) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Admin Action: Search Results',
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTitle('🔍 No Results Found')
        .setDescription(`No users found matching **${searchValue}** in ${searchType} search.`)
        .setColor(EMBED_COLORS.INFO)
        .setFooter({
          text: `Searched by ${interaction.user.username} • ${interaction.guild!.name}`,
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // 构建结果 Embed
    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Admin Action: Search Results',
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTitle(`🔍 Search Results: ${searchType}`)
      .setDescription(
        `Found **${results.length}** result${results.length !== 1 ? 's' : ''} for **${searchValue}**\n\n` +
        `**Search Type:** ${searchType === 'vrchat' ? 'VRChat Name' : searchType === 'discord' ? 'Discord ID' : 'Role'}`
      )
      .setColor(EMBED_COLORS.SUCCESS)
      .setFooter({
        text: `Searched by ${interaction.user.username} • ${interaction.guild!.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
      })
      .setTimestamp();

    // 添加结果字段（最多10个）
    const maxResults = Math.min(results.length, 10);
    for (let i = 0; i < maxResults; i++) {
      const result = results[i];
      
      let fieldValue = '';
      if (result.vrchatName) {
        fieldValue += `**VRChat:** ${result.vrchatName}\n`;
      }
      if (result.discordUserId) {
        fieldValue += `**Discord:** <@${result.discordUserId}> (${result.discordUsername})\n`;
      }
      if (result.type === 'member' && result.bindTime) {
        fieldValue += `**Bound:** <t:${Math.floor(result.bindTime.getTime() / 1000)}:R>\n`;
      }
      if (result.type === 'external') {
        fieldValue += `**Type:** External User\n`;
        if (result.roles && result.roles.length > 0) {
          fieldValue += `**Roles:** ${result.roles.slice(0, 3).join(', ')}${result.roles.length > 3 ? '...' : ''}\n`;
        }
        if (result.addedAt) {
          fieldValue += `**Added:** <t:${Math.floor(result.addedAt.getTime() / 1000)}:R>`;
        }
      }

      embed.addFields({
        name: `${i + 1}. ${result.type === 'member' ? '👤 Member' : '✨ External'}`,
        value: fieldValue || 'No additional info',
        inline: false
      });
    }

    if (results.length > 10) {
      embed.addFields({
        name: '⚠️ Results Truncated',
        value: `Showing first 10 of ${results.length} results. Refine your search for more specific results.`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
