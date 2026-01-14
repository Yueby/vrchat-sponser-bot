// /admin memory 命令处理
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { AVATAR_SIZES, EMBED_COLORS } from '../../config/constants';
import { handleCommandError, requireAdmin, requireGuild } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { clearCaches, getCacheStats, getMemoryUsage } from '../../utils/memory';

/**
 * 处理 /admin memory 命令
 */
export async function handleAdminMemory(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const guildId = requireGuild(interaction);
    if (!guildId) return;
    
    if (!requireAdmin(interaction)) return;
    
    const action = interaction.options.getString('action') || 'status';
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    if (action === 'status') {
      // 显示内存状态
      const memory = getMemoryUsage();
      const cache = getCacheStats();
      
      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Admin Action: Memory Status',
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTitle('📊 Memory & Cache Status')
        .setDescription(
          `Real-time memory and cache statistics for the bot.`
        )
        .setColor(memory.heapUsed > 200 ? EMBED_COLORS.WARNING : EMBED_COLORS.SUCCESS)
        .addFields(
          {
            name: '💾 Memory Usage',
            value:
              `**Heap Used:** ${memory.heapUsed} MB\n` +
              `**Heap Total:** ${memory.heapTotal} MB\n` +
              `**RSS:** ${memory.rss} MB\n` +
              `**External:** ${memory.external} MB`,
            inline: true
          },
          {
            name: '📦 Cache Statistics',
            value:
              `**Guilds:** ${cache.guilds}\n` +
              `**Members:** ${cache.members}\n` +
              `**Users:** ${cache.users}\n` +
              `**Roles:** ${cache.roles}`,
            inline: true
          },
          {
            name: '⚠️ Status',
            value:
              memory.heapUsed < 150
                ? '🟢 **Healthy** - Memory usage is normal'
                : memory.heapUsed < 200
                ? '🟡 **Moderate** - Memory usage is elevated'
                : '🔴 **High** - Consider clearing cache or restarting',
            inline: false
          }
        )
        .setFooter({
          text: `Requested by ${interaction.user.username} • ${interaction.guild!.name}`,
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`Admin ${interaction.user.username} checked memory status`);
      
    } else if (action === 'clear') {
      // 清理缓存
      const beforeMemory = getMemoryUsage();
      const beforeCache = getCacheStats();
      
      const clearedGuilds = clearCaches();
      
      // 等待一下让 GC 有机会运行
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterMemory = getMemoryUsage();
      const afterCache = getCacheStats();
      
      const memoryFreed = beforeMemory.heapUsed - afterMemory.heapUsed;
      const membersCleared = beforeCache.members - afterCache.members;
      const usersCleared = beforeCache.users - afterCache.users;
      
      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Admin Action: Clear Cache',
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTitle('✅ Cache Cleared')
        .setDescription(
          `Successfully cleared Discord.js caches to free up memory.`
        )
        .setColor(EMBED_COLORS.SUCCESS)
        .addFields(
          {
            name: '📊 Before',
            value:
              `**Memory:** ${beforeMemory.heapUsed} MB\n` +
              `**Members:** ${beforeCache.members}\n` +
              `**Users:** ${beforeCache.users}`,
            inline: true
          },
          {
            name: '📊 After',
            value:
              `**Memory:** ${afterMemory.heapUsed} MB\n` +
              `**Members:** ${afterCache.members}\n` +
              `**Users:** ${afterCache.users}`,
            inline: true
          },
          {
            name: '♻️ Cleared',
            value:
              `**Memory:** ${memoryFreed > 0 ? `${memoryFreed} MB freed` : 'N/A'}\n` +
              `**Members:** ${membersCleared}\n` +
              `**Users:** ${usersCleared}\n` +
              `**Guilds:** ${clearedGuilds}`,
            inline: false
          }
        )
        .setFooter({
          text: `Performed by ${interaction.user.username} • ${interaction.guild!.name}`,
          iconURL: interaction.user.displayAvatarURL({ size: AVATAR_SIZES.SMALL })
        })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`Admin ${interaction.user.username} cleared cache: ${membersCleared} members, ${memoryFreed} MB freed`);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
