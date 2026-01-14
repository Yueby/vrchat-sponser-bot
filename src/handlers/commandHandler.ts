// 命令路由处理器
import { ChatInputCommandInteraction } from 'discord.js';
import { handleAdminSync } from '../commands/admin/sync';
import { handleAdminUnbind } from '../commands/admin/unbind';
import { handleChangeName } from '../commands/changename';
import { handleServerApi } from '../commands/server/api';
import { handleServerStats } from '../commands/server/stats';
import { handleWhoAmI } from '../commands/whoami';
import { logger } from '../utils/logger';

/**
 * 处理所有斜杠命令的中央路由器
 */
export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'changename':
        await handleChangeName(interaction);
        break;

      case 'server':
        const serverSubcommand = interaction.options.getSubcommand();
        if (serverSubcommand === 'stats') {
          await handleServerStats(interaction);
        } else if (serverSubcommand === 'api') {
          await handleServerApi(interaction);
        }
        break;

      case 'admin':
        const adminSubcommand = interaction.options.getSubcommand();
        if (adminSubcommand === 'sync') {
          await handleAdminSync(interaction);
        } else if (adminSubcommand === 'unbind') {
          await handleAdminUnbind(interaction);
        }
        break;

      case 'whoami':
        await handleWhoAmI(interaction);
        break;

      default:
        await interaction.reply({
          content: '❌ Unknown command',
          ephemeral: true
        });
    }
  } catch (error) {
    logger.error('Command handler error:', error);
    // 这里的错误已经在各个命令处理函数中处理了
  }
}
