// 命令路由处理器
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import {
    handleExternalAdd,
    handleExternalList,
    handleExternalRemove,
    handleExternalUpdate
} from '../commands/admin/external';
import { handleAdminMemory } from '../commands/admin/memory';
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
        } else if (adminSubcommand === 'memory') {
          await handleAdminMemory(interaction);
        }
        break;

      case 'external':
        const externalSubcommand = interaction.options.getSubcommand();
        if (externalSubcommand === 'add') {
          await handleExternalAdd(interaction);
        } else if (externalSubcommand === 'update') {
          await handleExternalUpdate(interaction);
        } else if (externalSubcommand === 'remove') {
          await handleExternalRemove(interaction);
        } else if (externalSubcommand === 'list') {
          await handleExternalList(interaction);
        }
        break;

      case 'whoami':
        await handleWhoAmI(interaction);
        break;

      default:
        await interaction.reply({
          content: '❌ Unknown command',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    logger.error('Command handler error:', error);
    // 这里的错误已经在各个命令处理函数中处理了
  }
}
