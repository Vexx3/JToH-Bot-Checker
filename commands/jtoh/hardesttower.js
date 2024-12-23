const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const {
  difficultyColors,
  difficultyEmojis,
  fetchRobloxAvatar,
  fetchRobloxId,
  fetchAwardedDates,
} = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hardesttowers")
    .setDescription("Check the hardest towers beaten by a user in JToH")
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

    const robloxId = await fetchRobloxId(username);

    if (!robloxId) {
      return interaction.editReply(`User ${username} not found.`);
    }

    const avatarUrl = await fetchRobloxAvatar(robloxId);
    const awardedTowers = await fetchAwardedDates(robloxId);

    if (!awardedTowers?.length) {
      return interaction.editReply(
        `No JToH tower badges found for **${username}**.`
      );
    }

    awardedTowers.sort(
      (a, b) => (b.numDifficulty || 0) - (a.numDifficulty || 0)
    );
    const top10HardestTowers = awardedTowers.slice(0, 10);

    const hardestDifficulty = top10HardestTowers[0]?.difficultyName;
    const embedColor = difficultyColors[hardestDifficulty] || "#000000";
    const embed = new EmbedBuilder()
      .setTitle(`10 hardest tower(s) for ${username}`)
      .setColor(embedColor)
      .setThumbnail(avatarUrl)
      .addFields({
        name: "The list of hardest towers",
        value: top10HardestTowers
          .map(
            (tower) =>
              `**[${
                difficultyEmojis[tower.difficultyName.toLowerCase()] ||
                tower.difficultyName.toLowerCase()
              }]** ${tower.acronym} (${
                tower.numDifficulty || "nan"
              }) - <t:${Math.floor(
                new Date(tower.awardedDate).getTime() / 1000
              )}:R>`
          )
          .join("\n"),
      });

    await interaction.editReply({ embeds: [embed] });
  },
};
