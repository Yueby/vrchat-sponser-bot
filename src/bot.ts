import { Client, EmbedBuilder, GatewayIntentBits, Interaction, PermissionFlagsBits } from 'discord.js';
import mongoose from 'mongoose';
import DiscordUser from './models/DiscordUser';
import Guild from './models/Guild';
import VRChatBinding from './models/VRChatBinding';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // Required for member events
  ]
});

// User command cooldown system
const userCooldowns = new Map<string, number>();
const COOLDOWN_TIME = 3000; // 3 seconds cooldown

// Bot 启动时自动同步所有服务器
client.once('ready', async () => {
  console.log(`🤖 Bot logged in as ${client.user?.tag}`);
  console.log(`📡 Connected to ${client.guilds.cache.size} servers`);
  
  // 自动同步所有服务器
  console.log('🔄 Syncing all guilds and members...');
  let totalGuilds = 0;
  let totalMembers = 0;
  
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      // 确保 Guild 记录存在（仅存储核心配置）
      await Guild.findOneAndUpdate(
        { guildId },
        {
          ownerId: guild.ownerId,
          joinedAt: guild.joinedAt || new Date(),
          lastSyncAt: new Date()
        },
        { upsert: true, setDefaultsOnInsert: true } // apiEnabled 默认 true
      );
      
      // 同步所有成员（仅存储核心数据）
      await guild.members.fetch();
      let memberCount = 0;
      
      for (const [memberId, member] of guild.members.cache) {
        if (member.user.bot) continue;
        
        const roles = member.roles.cache
          .filter(role => role.name !== '@everyone')
          .map(role => role.id);
        
        await DiscordUser.findOneAndUpdate(
          { userId: member.id, guildId },
          {
            roles,
            isBooster: member.premiumSince !== null,
            joinedAt: member.joinedAt || new Date(),
            updatedAt: new Date()
          },
          { upsert: true }
        );
        
        memberCount++;
      }
      
      totalGuilds++;
      totalMembers += memberCount;
      console.log(`✅ Synced ${guild.name}: ${memberCount} members`);
    } catch (error) {
      console.error(`❌ Failed to sync guild ${guild.name}:`, error);
    }
  }
  
  console.log(`🎉 Sync complete: ${totalGuilds} guilds, ${totalMembers} members`);
});

// Bot 加入新服务器时自动激活并同步
client.on('guildCreate', async (guild) => {
  try {
    console.log(`🆕 Bot joined new guild: ${guild.name} (${guild.id})`);
    
    // 自动创建服务器记录（仅核心配置）
    await Guild.create({
      guildId: guild.id,
      ownerId: guild.ownerId,
      apiEnabled: true, // 默认允许 API 访问
      joinedAt: new Date()
    });
    
    // 自动同步所有成员
    await guild.members.fetch();
    let memberCount = 0;
    
    for (const [memberId, member] of guild.members.cache) {
      if (member.user.bot) continue;
      
      await DiscordUser.create({
        userId: member.id,
        guildId: guild.id,
        roles: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.id),
        isBooster: member.premiumSince !== null,
        joinedAt: member.joinedAt || new Date(),
        updatedAt: new Date()
      });
      
      memberCount++;
    }
    
    console.log(`✅ Guild setup complete: ${guild.name} (${memberCount} members synced)`);
  } catch (error) {
    console.error(`❌ Error setting up new guild ${guild.name}:`, error);
  }
});

// Bot 离开服务器时删除所有数据
client.on('guildDelete', async (guild) => {
  try {
    console.log(`👋 Bot left guild: ${guild.name} (${guild.id})`);
    
    // 删除该服务器的所有数据
    const [guildResult, usersResult, bindingsResult] = await Promise.all([
      Guild.deleteOne({ guildId: guild.id }),
      DiscordUser.deleteMany({ guildId: guild.id }),
      VRChatBinding.deleteMany({ guildId: guild.id })
    ]);
    
    console.log(`🗑️ Deleted data: Guild=${guildResult.deletedCount}, Users=${usersResult.deletedCount}, Bindings=${bindingsResult.deletedCount}`);
  } catch (error) {
    console.error(`❌ Error deleting guild data for ${guild.name}:`, error);
  }
});

// 成员加入服务器时自动记录
client.on('guildMemberAdd', async (member) => {
  try {
    if (member.user.bot) return;
    
    // 确保 Guild 记录存在（防止 Bot 重启后数据丢失）
    await Guild.findOneAndUpdate(
      { guildId: member.guild.id },
      { ownerId: member.guild.ownerId },
      { upsert: true, setDefaultsOnInsert: true }
    );
    
    // 创建成员记录（仅核心数据）
    await DiscordUser.create({
      userId: member.id,
      guildId: member.guild.id,
      roles: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.id),
      isBooster: member.premiumSince !== null,
      joinedAt: member.joinedAt || new Date(),
      updatedAt: new Date()
    });
    
    console.log(`👋 New member: ${member.user.username} joined ${member.guild.name}`);
  } catch (error) {
    console.error('❌ Error adding new member:', error);
  }
});

// 成员离开服务器时删除数据
client.on('guildMemberRemove', async (member) => {
  try {
    const userId = member.id;
    const guildId = member.guild.id;
    const username = member.user?.username || 'Unknown User';

    // 删除该用户在该服务器的数据
    const [discordUserResult, vrchatBindingResult] = await Promise.all([
      DiscordUser.findOneAndDelete({ userId, guildId }),
      VRChatBinding.findOneAndDelete({ discordUserId: userId, guildId })
    ]);

    if (discordUserResult || vrchatBindingResult) {
      console.log(`👋 User left ${member.guild.name}: ${username} (${userId}). Data deleted.`);
    }
  } catch (error) {
    console.error(`❌ Error deleting user on leave:`, error);
  }
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // ========== /changename 命令 ==========
  if (commandName === 'changename') {
    const newName = interaction.options.getString('name', true);
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const guildId = interaction.guildId;

    if (!guildId) {
      return interaction.reply({
        content: '❌ This command can only be used in a server!',
        ephemeral: true
      });
    }

    // Check user cooldown
    if (userCooldowns.has(userId)) {
      const expirationTime = userCooldowns.get(userId)! + COOLDOWN_TIME;
      if (Date.now() < expirationTime) {
        const timeLeft = Math.round((expirationTime - Date.now()) / 1000);
        return interaction.reply({
          content: `⏱️ Please wait **${timeLeft}** seconds before using this command again`,
          ephemeral: true
        });
      }
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // 获取成员信息
      const member = interaction.guild!.members.cache.get(userId);
      if (!member) {
        return interaction.editReply('❌ Could not find member information');
      }

      const roles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => role.id);

      const roleNames = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => role.name);

      // 更新 DiscordUser（仅核心数据）
      await DiscordUser.findOneAndUpdate(
        { userId, guildId },
        {
          roles,
          isBooster: member.premiumSince !== null,
          joinedAt: member.joinedAt || new Date(),
          updatedAt: new Date()
        },
        { upsert: true }
      );

      // 更新或创建 VRChat 绑定
      const existingBinding = await VRChatBinding.findOne({ discordUserId: userId, guildId });

      if (existingBinding) {
        await VRChatBinding.updateOne(
          { discordUserId: userId, guildId },
          { vrchatName: newName, bindTime: new Date() }
        );
      } else {
        await VRChatBinding.create({
          discordUserId: userId,
          guildId,
          vrchatName: newName,
          firstBindTime: new Date(),
          bindTime: new Date()
        });
      }

      const timestamp = Math.floor(Date.now() / 1000);
      
      await interaction.editReply(
        `✅ **Binding Successful!**\n\n` +
        `📝 VRChat Name: **${newName}**\n` +
        `👤 Discord User: ${username}\n` +
        `🎭 Current Roles: ${roleNames.length > 0 ? roleNames.join(', ') : 'None'}\n` +
        `⏰ Updated: <t:${timestamp}:R>`
      );
      
      userCooldowns.set(userId, Date.now());
      
      console.log(`User ${username} (${userId}) in ${interaction.guild!.name} changed name to ${newName}`);
    } catch (error) {
      console.error('Database Error:', error);
      
      let errorMessage = '❌ **Operation Failed**\n\n';
      
      if (error instanceof mongoose.Error) {
        if (error.name === 'MongooseServerSelectionError') {
          errorMessage += '💥 Database connection failed. Please try again later.';
        } else if (error.name === 'ValidationError') {
          errorMessage += '⚠️ Data validation failed. Please check your name format.';
        } else {
          errorMessage += '🔧 Database operation error. Please contact an administrator.';
        }
      } else {
        errorMessage += '⚠️ Internal server error. Please try again later or contact an administrator.';
      }
      
      await interaction.editReply(errorMessage);
    }
  }

  // ========== /server stats 命令 ==========
  if (commandName === 'server' && interaction.options.getSubcommand() === 'stats') {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
    }

    // 权限检查：仅服务器所有者和管理员
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.Administrator) && interaction.guild!.ownerId !== interaction.user.id) {
      return interaction.reply({ content: '❌ Only server administrators can use this command!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = await Guild.findOne({ guildId });
      const guildInfo = client.guilds.cache.get(guildId);

      if (!guild || !guildInfo) {
        return interaction.editReply('❌ Guild not found in database');
      }

      // 实时计算统计数据
      const memberCount = await DiscordUser.countDocuments({ guildId });
      const bindingCount = await VRChatBinding.countDocuments({ guildId });

      const embed = new EmbedBuilder()
        .setTitle(`📊 Server Statistics`)
        .setDescription(`**${guildInfo.name}**`)
        .setColor('#5865F2')
        .addFields(
          { name: '👥 Members in DB', value: memberCount.toString(), inline: true },
          { name: '🔗 VRChat Bindings', value: bindingCount.toString(), inline: true },
          { name: '📡 API Status', value: guild.apiEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: '🌐 API Endpoint', value: `\`/api/vrchat/sponsors/${guildId}\``, inline: false },
          { name: '🔄 Last Sync', value: guild.lastSyncAt ? `<t:${Math.floor(guild.lastSyncAt.getTime() / 1000)}:R>` : 'Never', inline: true },
          { name: '📞 Last API Call', value: guild.lastApiCallAt ? `<t:${Math.floor(guild.lastApiCallAt.getTime() / 1000)}:R>` : 'Never', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching stats:', error);
      await interaction.editReply('❌ Failed to fetch statistics');
    }
  }

  // ========== /server api 命令 ==========
  if (commandName === 'server' && interaction.options.getSubcommand() === 'api') {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
    }

    // 权限检查：仅服务器所有者
    if (interaction.guild!.ownerId !== interaction.user.id) {
      return interaction.reply({ content: '❌ Only the server owner can use this command!', ephemeral: true });
    }

    const enabled = interaction.options.getBoolean('enabled', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      await Guild.updateOne(
        { guildId },
        { apiEnabled: enabled },
        { upsert: true }
      );

      await interaction.editReply(
        `✅ API access has been **${enabled ? 'enabled' : 'disabled'}**\n\n` +
        `API Endpoint: \`/api/vrchat/sponsors/${guildId}\``
      );

      console.log(`API access ${enabled ? 'enabled' : 'disabled'} for guild ${interaction.guild!.name}`);
    } catch (error) {
      console.error('Error updating API status:', error);
      await interaction.editReply('❌ Failed to update API status');
    }
  }

  // ========== /admin sync 命令 ==========
  if (commandName === 'admin' && interaction.options.getSubcommand() === 'sync') {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
    }

    // 权限检查：仅管理员
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only administrators can use this command!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // 更新 Guild 的 lastSyncAt
      await Guild.updateOne(
        { guildId },
        { lastSyncAt: new Date() }
      );

      // 同步所有成员
      await interaction.guild!.members.fetch();
      let syncCount = 0;

      for (const [memberId, member] of interaction.guild!.members.cache) {
        if (member.user.bot) continue;

        const roles = member.roles.cache
          .filter(role => role.name !== '@everyone')
          .map(role => role.id);

        await DiscordUser.findOneAndUpdate(
          { userId: member.id, guildId },
          {
            roles,
            isBooster: member.premiumSince !== null,
            joinedAt: member.joinedAt || new Date(),
            updatedAt: new Date()
          },
          { upsert: true }
        );

        syncCount++;
      }

      await interaction.editReply(
        `✅ **Sync Complete!**\n\n` +
        `👥 Synced ${syncCount} members\n` +
        `⏰ Time: <t:${Math.floor(Date.now() / 1000)}:R>`
      );

      console.log(`Manual sync completed for ${interaction.guild!.name}: ${syncCount} members`);
    } catch (error) {
      console.error('Error syncing members:', error);
      await interaction.editReply('❌ Failed to sync members');
    }
  }

  // ========== /admin unbind 命令 ==========
  if (commandName === 'admin' && interaction.options.getSubcommand() === 'unbind') {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
    }

    // 权限检查：仅管理员
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only administrators can use this command!', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await VRChatBinding.findOneAndDelete({
        discordUserId: targetUser.id,
        guildId
      });

      if (result) {
        await interaction.editReply(
          `✅ **Unbind Successful!**\n\n` +
          `👤 User: ${targetUser.username}\n` +
          `📝 VRChat Name: ${result.vrchatName}\n` +
          `⏰ Time: <t:${Math.floor(Date.now() / 1000)}:R>`
        );

        console.log(`Admin ${interaction.user.username} unbound ${targetUser.username} in ${interaction.guild!.name}`);
      } else {
        await interaction.editReply(
          `ℹ️ **No Binding Found**\n\n` +
          `User ${targetUser.username} has no VRChat binding in this server.`
        );
      }
    } catch (error) {
      console.error('Error unbinding user:', error);
      await interaction.editReply('❌ Failed to unbind user');
    }
  }

  // ========== /whoami 命令 ==========
  if (commandName === 'whoami') {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const userId = interaction.user.id;
      const username = interaction.user.username;

      // 查询用户数据
      const discordUser = await DiscordUser.findOne({ userId, guildId });
      const vrchatBinding = await VRChatBinding.findOne({ discordUserId: userId, guildId });

      const member = interaction.guild!.members.cache.get(userId);
      const roleNames = member?.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => role.name) || [];

      const embed = new EmbedBuilder()
        .setTitle('👤 Your Profile')
        .setColor('#5865F2')
        .addFields(
          { name: 'Discord User', value: username, inline: true },
          { name: 'User ID', value: userId, inline: true },
          { name: 'VRChat Name', value: vrchatBinding ? vrchatBinding.vrchatName : 'Not bound', inline: false },
          { name: 'Roles', value: roleNames.length > 0 ? roleNames.join(', ') : 'None', inline: false },
          { name: 'Server Booster', value: discordUser?.isBooster ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Joined Server', value: discordUser?.joinedAt ? `<t:${Math.floor(discordUser.joinedAt.getTime() / 1000)}:D>` : 'Unknown', inline: true }
        )
        .setTimestamp();

      if (vrchatBinding) {
        embed.addFields(
          { name: 'First Bind', value: `<t:${Math.floor(vrchatBinding.firstBindTime.getTime() / 1000)}:R>`, inline: true },
          { name: 'Last Update', value: `<t:${Math.floor(vrchatBinding.bindTime.getTime() / 1000)}:R>`, inline: true }
        );
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching user info:', error);
      await interaction.editReply('❌ Failed to fetch your information');
    }
  }
});

// Database connection function
export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not defined');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};
