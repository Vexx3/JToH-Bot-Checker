const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const { fetchAreaData } = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("areacode")
    .setDescription("Lists all area acronyms in JToH")
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
    const areaData = await fetchAreaData();
    const acronyms = areaData
      .map((area) => `${area.name} - ${area.acronym}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Area code")
      .setColor("#58b9ff")
      .setDescription(acronyms);

    await interaction.reply({ embeds: [embed] });
  },
};
