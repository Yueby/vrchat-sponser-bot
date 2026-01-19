import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  logger.error('Missing DISCORD_TOKEN or CLIENT_ID in environment variables');
  process.exit(1);
}

const commands = [
  // 1. 全能用户指令集 (/user)
  new SlashCommandBuilder()
    .setName('user')
    .setDescription('Personal profile and settings')
    .addSubcommand(sub =>
      sub.setName('me')
        .setDescription('View your profile cards and sponsorship status')
    )
    .addSubcommand(sub =>
      sub.setName('update')
        .setDescription('Update your VRChat name or custom avatar')
        .addStringOption(opt =>
          opt.setName('vrchat_name')
            .setDescription('New VRChat display name')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('avatar_url')
            .setDescription('Direct link to a custom avatar image')
            .setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('View your VRChat name change history')
    ),

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
          sub.setName('remove')
            .setDescription('Remove a user')
            .addStringOption(opt => opt.setName('user_id').setDescription('User ID to remove').setRequired(true))
        )
    )
    // 维护指令
    .addSubcommand(sub => sub.setName('search').setDescription('Search for any user').addStringOption(opt => opt.setName('type').setDescription('Search type').setRequired(true).addChoices({ name: 'VRChat Name', value: 'vrchat' }, { name: 'Discord ID', value: 'discord' }, { name: 'Role', value: 'role' })).addStringOption(opt => opt.setName('value').setDescription('Value to search for').setRequired(true)))
    .addSubcommand(sub => sub.setName('refresh').setDescription('Force refresh data cache'))
    .addSubcommand(sub => sub.setName('unbound').setDescription('List sponsors without VRChat binding')),

  // 3. 服务器配置指令集 (/server)
  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Server core settings')
    .addSubcommandGroup(group =>
      group.setName('sync')
        .setDescription('Sync settings and actions')
        .addSubcommand(sub => sub.setName('now').setDescription('Trigger manual synchronization now'))
        .addSubcommand(sub => sub.setName('status').setDescription('View sync status'))
    )
    .addSubcommandGroup(group =>
      group.setName('roles')
        .setDescription('Managed roles settings')
        .addSubcommand(sub => sub.setName('add').setDescription('Add a role to manage').addRoleOption(opt => opt.setName('role').setDescription('Role to manage').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all managed roles'))
    )
    .addSubcommandGroup(group =>
      group.setName('api')
        .setDescription('Web API settings')
        .addSubcommand(sub => sub.setName('toggle').setDescription('Enable/Disable Web API Access'))
        .addSubcommand(sub => sub.setName('status').setDescription('View API status and key'))
    )
    .addSubcommand(sub =>
      sub.setName('notify')
        .setDescription('Set a user to receive name change notifications')
        .addUserOption(opt => opt.setName('user').setDescription('User to notify (leave empty to clear)').setRequired(false))
    )
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
