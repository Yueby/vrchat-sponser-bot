import dotenv from 'dotenv';
import { client, connectDB } from './bot';
import { startServer } from './server';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const main = async () => {
  // 1. Start Web Server
  startServer();

  // 2. Connect to Database
  await connectDB();

  // 3. Login Bot
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    logger.error('❌ DISCORD_TOKEN is missing');
    process.exit(1);
  }

  await client.login(token);
};

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
