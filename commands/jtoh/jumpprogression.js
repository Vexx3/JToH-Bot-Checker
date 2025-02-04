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
    .setName("jumpprogression")
    .setDescription("Check the jump progression by a user in JToH")
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
      (a, b) => new Date(a.awardedDate) - new Date(b.awardedDate)
    );

    let highestDifficulty;
    const significantProgression = [];

    for (const tower of awardedTowers) {
      if (highestDifficulty === undefined || tower.numDifficulty > highestDifficulty) {
        highestDifficulty = tower.numDifficulty;
        significantProgression.push(tower);
      }
    }

    const embedColor =
      difficultyColors[
        significantProgression[significantProgression.length - 1].difficultyName
      ];
    const embed = new EmbedBuilder()
      .setTitle(`Jump progression of ${username}`)
      .setColor(embedColor)
      .setThumbnail(avatarUrl)
      .setDescription(
        significantProgression
          .map(
            (tower) =>
              `**[${difficultyEmojis[tower.difficultyName.toLowerCase()] || tower.difficultyName.toLowerCase()}]** ${
                tower.acronym
              } (${tower.numDifficulty}) - <t:${Math.floor(
                new Date(tower.awardedDate).getTime() / 1000
              )}:R>`
          )
          .join("\n")
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
