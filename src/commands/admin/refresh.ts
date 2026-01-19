import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { apiCache } from '../../utils/cache';
import { logger } from '../../utils/logger';
import { EMBED_COLORS } from '../../config/constants';

/**
 * 处理 /admin refresh 命令
 * 清除当前服务器的 API 缓存
 */
export async function handleAdminRefresh(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
        await interaction.reply({
            content: '🔴 This command can only be used in a server.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    try {
        // 清除该服务器的缓存
        apiCache.delete(guildId);

        logger.info(`Admin ${interaction.user.tag} refreshed cache for guild ${guildId}`);

        const embed = new EmbedBuilder()
            .setTitle('Cache Refreshed')
            .setDescription('The API cache for this server has been successfully cleared.')
            .setColor(EMBED_COLORS.SUCCESS)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        logger.error('Error refreshing cache:', error);
        await interaction.reply({
            content: '🔴 Failed to clear cache.',
            flags: MessageFlags.Ephemeral
        });
    }
}
