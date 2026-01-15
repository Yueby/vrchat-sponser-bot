// 统一的错误处理工具
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import mongoose from 'mongoose';
import { logger } from './logger';

/**
 * 根据错误类型生成友好的错误消息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof mongoose.Error) {
    switch (error.name) {
      case 'MongooseServerSelectionError':
        return '💥 Database connection failed. Please try again later.';
      case 'ValidationError':
        return '⚠️ Data validation failed. Please check your input.';
      default:
        return '🔧 Database operation error. Please contact an administrator.';
    }
  }
  
  if (error instanceof Error) {
    return `⚠️ ${error.message}`;
  }
  
  return '⚠️ Internal server error. Please try again later or contact an administrator.';
}

/**
 * 处理命令执行错误并返回用户友好的错误消息
 */
export async function handleCommandError(interaction: ChatInputCommandInteraction, error: unknown): Promise<void> {
  // 增强错误日志，添加更多上下文信息
  logger.error('Command Error:', {
    command: interaction.commandName,
    user: interaction.user.id,
    username: interaction.user.username,
    guild: interaction.guildId,
    channel: interaction.channelId,
    error: error
  });
  
  const errorMessage = '❌ **Operation Failed**\n\n' + getErrorMessage(error);
  
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(errorMessage);
  } else {
    await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
  }
}

/**
 * 检查命令是否在服务器中执行
 */
export function requireGuild(interaction: ChatInputCommandInteraction): string | null {
  if (!interaction.guildId) {
    interaction.reply({
      content: '❌ This command can only be used in a server!',
      flags: MessageFlags.Ephemeral
    });
    return null;
  }
  return interaction.guildId;
}

/**
 * 检查用户是否是服务器管理员
 */
export function requireAdmin(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.guild!.members.cache.get(interaction.user.id);
  if (!member?.permissions.has('Administrator')) {
    interaction.reply({
      content: '❌ Only administrators can use this command!',
      flags: MessageFlags.Ephemeral
    });
    return false;
  }
  return true;
}

/**
 * 检查用户是否是服务器所有者
 */
export function requireOwner(interaction: ChatInputCommandInteraction): boolean {
  if (interaction.guild!.ownerId !== interaction.user.id) {
    interaction.reply({
      content: '❌ Only the server owner can use this command!',
      flags: MessageFlags.Ephemeral
    });
    return false;
  }
  return true;
}
