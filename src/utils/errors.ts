// 统一的错误处理工具
import { ChatInputCommandInteraction } from 'discord.js';
import mongoose from 'mongoose';
import { logger } from './logger';

/**
 * 处理命令执行错误并返回用户友好的错误消息
 */
export async function handleCommandError(interaction: ChatInputCommandInteraction, error: unknown): Promise<void> {
  logger.error('Command Error:', error);
  
  let errorMessage = '❌ **Operation Failed**\n\n';
  
  if (error instanceof mongoose.Error) {
    if (error.name === 'MongooseServerSelectionError') {
      errorMessage += '💥 Database connection failed. Please try again later.';
    } else if (error.name === 'ValidationError') {
      errorMessage += '⚠️ Data validation failed. Please check your input.';
    } else {
      errorMessage += '🔧 Database operation error. Please contact an administrator.';
    }
  } else if (error instanceof Error) {
    errorMessage += `⚠️ ${error.message}`;
  } else {
    errorMessage += '⚠️ Internal server error. Please try again later or contact an administrator.';
  }
  
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(errorMessage);
  } else {
    await interaction.reply({ content: errorMessage, ephemeral: true });
  }
}

/**
 * 检查命令是否在服务器中执行
 */
export function requireGuild(interaction: ChatInputCommandInteraction): string | null {
  if (!interaction.guildId) {
    interaction.reply({
      content: '❌ This command can only be used in a server!',
      ephemeral: true
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
      ephemeral: true
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
      ephemeral: true
    });
    return false;
  }
  return true;
}
