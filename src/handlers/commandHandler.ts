import { ChatInputCommandInteraction } from 'discord.js';
import { handleAdminRefreshCommand } from '../commands/admin/refresh';
import { handleAdminSearchCommand } from '../commands/admin/search';
import { handleAdminUnboundCommand } from '../commands/admin/unbound';
import { handleAdminUserCommand } from '../commands/admin/user';
import { handleUserProfile } from '../commands/user/me';
import { handleServerSettings } from '../commands/server/settings';
import { showBindModal } from './interactionHandler';
import { requireGuild } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * 路由所有斜杠命令
 */
export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;

  try {
    switch (commandName) {

      case 'me':
        const meGuildId = requireGuild(interaction);
        if (meGuildId) await handleUserProfile(interaction, meGuildId);
        break;

      case 'bind':
        await showBindModal(interaction);
        break;

      // 服务器管理指令集 (改为单入口交互面板)
      case 'server':
        await handleServerSettings(interaction);
        break;

      // 管理员维护指令集
      case 'admin':
        const adminSubcommandGroup = interaction.options.getSubcommandGroup();
        const adminSubcommand = interaction.options.getSubcommand();

        if (adminSubcommandGroup === 'user') {
          await handleAdminUserCommand(interaction);
        } else if (adminSubcommand === 'search') {
          await handleAdminSearchCommand(interaction);
        } else if (adminSubcommand === 'refresh') {
          await handleAdminRefreshCommand(interaction);
        } else if (adminSubcommand === 'unbound') {
          await handleAdminUnboundCommand(interaction);
        }
        break;

      default:
        logger.warn(`Unknown command: ${commandName}`);
        break;
    }
  } catch (error) {
    logger.error(`Error handling command ${commandName}:`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '🔴 An error occurred while executing the command.', ephemeral: true });
    } else {
      await interaction.editReply('🔴 An error occurred while executing the command.');
    }
  }
}
