const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Get a mystical answer to your question from the 8-ball")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Ask a question")
        .setRequired(true)
    )
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
    const question = interaction.options.getString("question");

    const responses = [
      "It is certain.",
      "Reply hazy, try again.",
      "Don’t count on it.",
      "It is decidedly so.",
      "My reply is no.",
      "Without a doubt.",
      "Better not tell you now.",
      "My sources say no.",
      "Yes, definitely.",
      "Cannot predict now.",
      "Outlook not so good.",
      "You may rely on it.",
      "Concentrate and ask again.",
      "Very doubtful.",
      "As I see it, yes.",
      "Most likely.",
      "Outlook good.",
      "Yes.",
      "Signs point to yes.",
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    await interaction.reply(
      `🎱 **Question:** ${question}\n**Answer:** ${randomResponse}`
    );
  },
};
