const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's latency and connection speed.")
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),
  async execute(interaction) {
    const websocketPing = interaction.client.ws.ping;

    const sent = await interaction.reply({
      content: "🏓 Pinging...",
      fetchReply: true,
    });

    const roundtripLatency =
      sent.createdTimestamp - interaction.createdTimestamp;

    await interaction.editReply(
      "🏓 Pong! Here are my current stats:\n\n" +
        `**🌐 WebSocket Heartbeat:** \`${websocketPing}ms\`\n` +
        `**⏱️ Roundtrip Latency:** \`${roundtripLatency}ms\``
    );
  },
};
