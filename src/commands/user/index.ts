import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { handleCommandError, requireGuild } from '../../utils/errors';
import { handleUserMe } from './me';
import { handleUserUpdate } from './update';
import { handleUserHistory } from './history';

/**
 * /user 指令族路由器
 */
export async function handleUserCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = requireGuild(interaction);
  if (!guildId) return;

  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    switch (subcommand) {
      case 'me': await handleUserMe(interaction, guildId); break;
      case 'update': await handleUserUpdate(interaction, guildId); break;
      case 'history': await handleUserHistory(interaction, guildId); break;
      default: await interaction.editReply('🔴 Unknown subcommand.');
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
