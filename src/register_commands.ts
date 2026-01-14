import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  logger.error("❌ Missing environment variables: DISCORD_TOKEN or CLIENT_ID");
  process.exit(1);
}

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

  // /server - 服务器管理命令（包含 stats 和 api 子命令）
  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Server management commands')
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
    ),

  // /admin - 管理员命令（包含 sync 和 unbind 子命令）
  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Administrator commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('sync')
        .setDescription('Manually sync all server members to database')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unbind')
        .setDescription('Force unbind a user\'s VRChat name')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to unbind')
            .setRequired(true)
        )
    ),

  // /whoami - 查看自己的信息
  new SlashCommandBuilder()
    .setName('whoami')
    .setDescription('View your profile and binding status'),

  // /external - 外部用户管理命令（管理员专用）
  new SlashCommandBuilder()
    .setName('external')
    .setDescription('Manage external users who cannot join the server (Admin only)')
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

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    logger.info('🔄 Refreshing application (/) commands...');
    logger.info(`📝 Registering ${commands.length} commands:`);
    commands.forEach(cmd => {
      logger.info(`   - /${cmd.name}`);
    });

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );

    logger.success('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
})();
