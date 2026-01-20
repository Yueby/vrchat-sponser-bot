import { REST, Routes, SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  logger.error('Missing DISCORD_TOKEN or CLIENT_ID in environment variables');
  process.exit(1);
}

const commands = [
  // 1. 快捷个人资料 (/me)
  new SlashCommandBuilder()
    .setName('me')
    .setDescription('Quickly view your profile cards and sponsorship status'),


  // 3. 上下文菜单：查看成员资料
  new ContextMenuCommandBuilder()
    .setName('View VRChat Profile')
    .setType(ApplicationCommandType.User),

  // 4. 上下文菜单：管理员管理
  new ContextMenuCommandBuilder()
    .setName('Manage Sponsor')
    .setType(ApplicationCommandType.User),

  // 2. 统合管理指令集 (/admin)
  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Open the administrator dashboard'),

  // 3. 服务器配置指令集 (/server) - 单入口交互面板
  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Open the server management and settings panel'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    logger.info('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    logger.success('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error('Failed to reload commands:', error);
  }
})();
