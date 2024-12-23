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
    .setName("recentbeaten")
    .setDescription("Check the most recent towers beaten by a user in JToH")
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
      (a, b) => new Date(b.awardedDate) - new Date(a.awardedDate)
    );
    const top10RecentTowers = awardedTowers.slice(0, 10);

    const hardestTowerDifficulty = top10RecentTowers[0]?.difficultyName;
    const embedColor = difficultyColors[hardestTowerDifficulty] || "#000000";
    const embed = new EmbedBuilder()
      .setTitle(`10 most recent tower(s) for ${username}`)
      .setColor(embedColor)
      .setThumbnail(avatarUrl)
      .addFields({
        name: "List of tower",
        value: top10RecentTowers
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

    return interaction.editReply({ embeds: [embed] });
  },
};
