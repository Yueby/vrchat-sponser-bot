import { ChatInputCommandInteraction } from 'discord.js';
import { handleAdminApiCommand } from '../commands/server/api';
import { handleAdminRolesCommand } from '../commands/server/roles';
import { handleAdminSyncCommand } from '../commands/server/sync';
import { handleAdminRefreshCommand } from '../commands/admin/refresh';
import { handleAdminSearchCommand } from '../commands/admin/search';
import { handleAdminUnboundCommand } from '../commands/admin/unbound';
import { handleAdminUserCommand } from '../commands/admin/user';
import { handleUserCommand } from '../commands/user/index';
import { handleServerNotify } from '../commands/server/notify';
import { logger } from '../utils/logger';

/**
 * 路由所有斜杠命令
 */
export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;

  try {
    switch (commandName) {
      // 统合后的用户指令集
      case 'user':
        await handleUserCommand(interaction);
        break;

      // 服务器管理指令集
      case 'server':
        const serverSubcommandGroup = interaction.options.getSubcommandGroup();
        if (serverSubcommandGroup === 'sync') {
          await handleAdminSyncCommand(interaction);
        } else if (serverSubcommandGroup === 'roles') {
          await handleAdminRolesCommand(interaction);
        } else if (serverSubcommandGroup === 'api') {
          await handleAdminApiCommand(interaction);
        } else {
          const serverSubcommand = interaction.options.getSubcommand();
          if (serverSubcommand === 'notify') {
            await handleServerNotify(interaction);
          }
        }
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
