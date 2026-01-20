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

  // 2. 快捷绑定 (/bind)
  new SlashCommandBuilder()
    .setName('bind')
    .setDescription('Quickly update your VRChat name or custom avatar'),

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
    .setDescription('Maintenance and administration')
    // 用户管理组
    .addSubcommandGroup(group =>
      group.setName('user')
        .setDescription('Manage sponsors manually')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Manually add a sponsor')
            .addStringOption(opt => opt.setName('vrchat_name').setDescription('VRChat Name').setRequired(true))
            .addStringOption(opt => opt.setName('roles').setDescription('Comma-separated roles').setRequired(true))
            .addUserOption(opt => opt.setName('server_member').setDescription('Link to a server member (optional)'))
            .addStringOption(opt => opt.setName('external_name').setDescription('Manual display name if not in server'))
            .addStringOption(opt => opt.setName('notes').setDescription('Admin notes'))
        )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('List all sponsors')
            .addStringOption(opt => opt.setName('type').setDescription('Filter by type').addChoices({ name: 'Discord', value: 'discord' }, { name: 'Manual', value: 'manual' }))
        )
        .addSubcommand(sub =>
          sub.setName('update')
            .setDescription('Update an existing user (Discord or Manual)')
            .addStringOption(opt => opt.setName('user_id').setDescription('The ID of the user to update').setRequired(true).setAutocomplete(true))
            .addStringOption(opt => opt.setName('vrchat_name').setDescription('New VRChat Name').setRequired(false))
            .addStringOption(opt => opt.setName('roles').setDescription('New comma-separated roles').setRequired(false))
            .addStringOption(opt => opt.setName('external_name').setDescription('New manual display name').setRequired(false))
            .addStringOption(opt => opt.setName('notes').setDescription('New admin notes').setRequired(false))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a user')
            .addStringOption(opt => opt.setName('user_id').setDescription('User ID to remove').setRequired(true).setAutocomplete(true))
        )
    )
    // 维护指令
    .addSubcommand(sub => sub.setName('search').setDescription('Search for any user').addStringOption(opt => opt.setName('type').setDescription('Search type').setRequired(true).addChoices({ name: 'VRChat Name', value: 'vrchat' }, { name: 'Discord ID', value: 'discord' }, { name: 'Role', value: 'role' })).addStringOption(opt => opt.setName('value').setDescription('Value to search for').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('refresh').setDescription('Force refresh data cache'))
    .addSubcommand(sub => sub.setName('unbound').setDescription('List sponsors without VRChat binding')),

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
