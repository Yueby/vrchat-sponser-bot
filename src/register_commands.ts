import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("❌ Missing environment variables: DISCORD_TOKEN or CLIENT_ID");
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
    .setDescription('View your profile and binding status')
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Refreshing application (/) commands...');
    console.log(`📝 Registering ${commands.length} commands:`);
    commands.forEach(cmd => {
      console.log(`   - /${cmd.name}`);
    });

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
})();
