import {
  Interaction,
  ButtonInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction,
  RepliableInteraction,
  MessageFlags,
} from "discord.js";

/**
 * 定义支持 deferUpdate 的交互类型联合
 */
export type UpdateableInteraction =
  | ButtonInteraction
  | ModalSubmitInteraction
  | AnySelectMenuInteraction;

/**
 * 类型守卫: 判断交互是否支持 deferUpdate
 * 通过此检查后，TS 会自动将类型收窄为 UpdateableInteraction
 */
export function isUpdateable(
  interaction: Interaction,
): interaction is UpdateableInteraction {
  return (
    interaction.isButton() ||
    interaction.isModalSubmit() ||
    interaction.isAnySelectMenu()
  );
}

/**
 * 智能推迟回复 (Generic Friendly & Safe)
 * 自动判断是 deferUpdate (原地更新) 还是 deferReply (发送新消息)
 *
 * @param interaction 任何可回复的交互 (RepliableInteraction)
 */
export async function smartDefer(
  interaction: RepliableInteraction,
): Promise<void> {
  // 防止重复推迟或回复
  if (interaction.deferred || interaction.replied) return;

  if (isUpdateable(interaction)) {
    // 类型已在此块中自动收窄，无需 as any
    await interaction.deferUpdate();
  } else {
    // 对于这类交互 (如 Slash Command)，只能 deferReply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }
}
