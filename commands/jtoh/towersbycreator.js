const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const {
  difficultyOrder,
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
        .setDescription("Roblox username")
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
      const creatorTowers = towerData
        .filter(
          (tower) =>
            tower.creators &&
            tower.creators.toLowerCase().includes(username.toLowerCase())
        )
        .sort((a, b) => {
          const difficultyA = difficultyOrder.indexOf(
            a.difficultyName.toLowerCase()
          );
          const difficultyB = difficultyOrder.indexOf(
            b.difficultyName.toLowerCase()
          );
          return difficultyA - difficultyB;
        });

      if (!creatorTowers?.length) {
        return interaction.editReply(
          `No towers found for creator **${username}**.`
        );
      }

      const embed = new EmbedBuilder()
        .setTitle(`Towers by ${username}`)
        .setColor("#58b9ff")
        .setThumbnail(avatarUrl)
        .setDescription(
          `**The list of towers:**\n${creatorTowers
            .map((tower) => {
              const emoji = tower.difficultyName
                ? difficultyEmojis[tower.difficultyName.toLowerCase()]
                : ":question:";
              return `**[${emoji}]** ${tower.name}`;
            })
            .join("\n")}`
        );

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "An error occurred while executing this command."
      );
    }
  },
};
