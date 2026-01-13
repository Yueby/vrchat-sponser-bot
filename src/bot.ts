import { Client, GatewayIntentBits, Interaction } from 'discord.js';
import mongoose from 'mongoose';
import User from './models/User';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

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

    // Ephemeral loading state
    await interaction.deferReply({ ephemeral: true });

    try {
      // Upsert: Find and update, or insert if not exists
      await User.findOneAndUpdate(
        { userId },
        { 
          customName: newName,
          username,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      await interaction.editReply(`✅ Success! Your name has been updated to **${newName}**.`);
      console.log(`User ${username} (${userId}) changed name to ${newName}`);
    } catch (error) {
      console.error('Database Error:', error);
      await interaction.editReply('❌ Failed to save. Please try again later.');
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
