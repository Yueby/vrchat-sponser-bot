import { PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { validateEnv } from './utils/env';
import { logger } from './utils/logger';

dotenv.config();
validateEnv(); // 使用统一的环境变量验证

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

const commands = [
  // /changename - 绑定或更新 VRChat 名字
  new SlashCommandBuilder()
    .setName('changename')
    .setDescription('Bind or update your VRChat name')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Your VRChat display name')
        .setRequired(true)
    ),

  // /server - 服务器管理命令
  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Server management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(group =>
      group
        .setName('roles')
        .setDescription('Manage tracked roles (Owner only)')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Add a role to track')
            .addRoleOption(opt => 
              opt.setName('role')
                .setDescription('Role to track')
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove a tracked role')
            .addRoleOption(opt => 
              opt.setName('role')
                .setDescription('Role to remove')
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('list').setDescription('View current tracked roles')
        )
        .addSubcommand(sub =>
          sub.setName('clear').setDescription('Clear all tracked roles')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('notify')
        .setDescription('Configure changename notification target (Owner only)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to receive notifications (leave empty to clear)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View server statistics and API information')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('api')
        .setDescription('Enable or disable API access (Owner only)')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable API access')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sync')
        .setDescription('Manually sync members with managed roles to database')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('memory')
        .setDescription('View or manage bot memory usage (Owner only)')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform')
            .setRequired(false)
            .addChoices(
              { name: 'View Status', value: 'status' },
              { name: 'Clear Cache', value: 'clear' }
            )
        )
    ),

  // /admin - 管理员命令
  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Administrator commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('unbind')
        .setDescription('Force unbind a user\'s VRChat name')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to unbind')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('Search for users by VRChat name, Discord ID, or role')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Search type')
            .setRequired(true)
            .addChoices(
              { name: 'VRChat Name', value: 'vrchat' },
              { name: 'Discord ID', value: 'discord' },
              { name: 'Role', value: 'role' }
            )
        )
        .addStringOption(option =>
          option.setName('value')
            .setDescription('Search value (partial match for VRChat/Role, exact for Discord ID)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unbound')
        .setDescription('View list of members who haven\'t bound VRChat names')
    ),

  // /whoami - 查看自己的信息
  new SlashCommandBuilder()
    .setName('whoami')
    .setDescription('View your profile and binding status'),

  // /history - 查看绑定历史
  new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your VRChat name change history'),

  // /external - 外部用户管理命令（管理员专用）
  new SlashCommandBuilder()
    .setName('external')
    .setDescription('Manage external users who cannot join the server (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add an external user')
        .addStringOption(option =>
          option.setName('vrchat_name')
            .setDescription('VRChat display name')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('roles')
            .setDescription('Role names (comma-separated)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('discord_user_id')
            .setDescription('Discord User ID (optional)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('display_name')
            .setDescription('Custom display name (optional)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('notes')
            .setDescription('Additional notes (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update an external user')
        .addStringOption(option =>
          option.setName('identifier')
            .setDescription('VRChat name or Discord ID')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('vrchat_name')
            .setDescription('New VRChat name (optional)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('roles')
            .setDescription('New role names (comma-separated, optional)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('display_name')
            .setDescription('New display name (optional)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('notes')
            .setDescription('New notes (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an external user')
        .addStringOption(option =>
          option.setName('identifier')
            .setDescription('VRChat name or Discord ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all external users')
        .addStringOption(option =>
          option.setName('role')
            .setDescription('Filter by role name (optional)')
            .setRequired(false)
        )
    )
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN!);

(async () => {
  try {
    logger.info('Refreshing application (/) commands...');
    logger.info(`Registering ${commands.length} commands:`);
    commands.forEach(cmd => {
      logger.info(`   - /${cmd.name}`);
    });

    await rest.put(
      Routes.applicationCommands(CLIENT_ID!),
      { body: commands },
    );

    logger.success('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error('Failed to register commands:', error);
    process.exit(1);
  }
})();
