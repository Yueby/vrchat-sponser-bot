import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { handleAdminPanel } from "../commands/admin/panel";
import { handleUserProfile } from "../commands/user/me";
import { handleServerSettings } from "../commands/server/settings";
import { requireGuild } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * 路由所有斜杠命令
 */
export async function handleCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "me":
        const meGuildId = requireGuild(interaction);
        if (meGuildId) await handleUserProfile(interaction, meGuildId);
        break;

      // 服务器管理指令集 (改为单入口交互面板)
      case "server":
        await handleServerSettings(interaction);
        break;

      // 管理员维护指令集
      case "admin":
        await handleAdminPanel(interaction);
        break;

      default:
        logger.warn(`Unknown command: ${commandName}`);
        break;
    }
  } catch (error) {
    logger.error(`Error handling command ${commandName}:`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "🔴 An error occurred while executing the command.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.editReply(
        "🔴 An error occurred while executing the command.",
      );
    }
  }
}
