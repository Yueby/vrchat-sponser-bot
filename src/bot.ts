import { Client, GatewayIntentBits, Interaction } from 'discord.js';
import mongoose from 'mongoose';
import User from './models/User';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// User command cooldown system
const userCooldowns = new Map<string, number>();
const COOLDOWN_TIME = 3000; // 3 seconds cooldown

client.once('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'changename') {
    const newName = interaction.options.getString('name', true);
    const userId = interaction.user.id;
    const username = interaction.user.username;

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

    // Ephemeral loading state
    await interaction.deferReply({ ephemeral: true });

    try {
      // Get user avatar URL
      const avatarUrl = interaction.user.displayAvatarURL({ size: 256 });

      // Get server member info (including roles)
      let roles: string[] = [];
      let roleNames: string[] = [];

      if (interaction.guild && interaction.member) {
        const member = interaction.guild.members.cache.get(userId);
        if (member) {
          // Filter out @everyone role, keep only real roles
          roles = member.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => role.id);
          roleNames = member.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => role.name);
        }
      }

      // Upsert: Find and update, or insert if not exists
      await User.findOneAndUpdate(
        { userId },
        { 
          customName: newName,
          username,
          avatar: avatarUrl,
          roles,
          roleNames,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      // Generate Discord timestamp (relative time display)
      const timestamp = Math.floor(Date.now() / 1000);
      
      await interaction.editReply(
        `✅ **Binding Successful!**\n\n` +
        `📝 VRChat Name: **${newName}**\n` +
        `👤 Discord User: ${username}\n` +
        `🎭 Current Roles: ${roleNames.length > 0 ? roleNames.join(', ') : 'None'}\n` +
        `⏰ Updated: <t:${timestamp}:R>`
      );
      
      // Set user cooldown
      userCooldowns.set(userId, Date.now());
      
      console.log(`User ${username} (${userId}) changed name to ${newName}`);
    } catch (error) {
      console.error('Database Error:', error);
      
      // Provide more specific error messages
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
});

// Database connection function
export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not defined');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000, // Timeout after 30s instead of 10s
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};
