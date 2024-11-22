const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const {
  fetchTowerDifficultyData,
  difficultyEmojis,
  fetchRobloxAvatar,
  fetchRobloxId,
} = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("towersbycreator")
    .setDescription("Lists towers created by a specified creator.")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("The creator's username")
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
    await interaction.deferReply();

    const username = interaction.options.getString("username");

    try {
      const robloxId = await fetchRobloxId(username);
      if (!robloxId) {
        return interaction.editReply(`User ${username} not found.`);
      }

      const avatarUrl = await fetchRobloxAvatar(robloxId);
      const towerData = await fetchTowerDifficultyData();
      const creatorTowers = towerData.filter((tower) =>
        tower.creators.toLowerCase().includes(username.toLowerCase())
      );

      if (!creatorTowers?.length) {
        return interaction.editReply(
          `No towers found for creator **${username}**.`
        );
      }

      const embed = new EmbedBuilder()
        .setTitle("Towers by creator")
        .setColor("#58b9ff")
        .setThumbnail(avatarUrl)
        .addFields({
          name: "The list of towers",
          value: creatorTowers
            .map(
              (tower) =>
                `**[${difficultyEmojis[tower.difficultyName]}]** ${tower.name}`
            )
            .join("\n"),
        });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "An error occurred while executing this command."
      );
    }
  },
};
