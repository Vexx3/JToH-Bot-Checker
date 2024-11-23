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
  fetchJToHBadges,
  fetchAwardedDates,
} = require("../../models/utils");

module.exports = {
  cooldown: 20,
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

    try {
      const robloxId = await fetchRobloxId(username);

      if (!robloxId) {
        return interaction.editReply(`User ${username} not found.`);
      }

      const avatarUrl = await fetchRobloxAvatar(robloxId);
      const jtohBadges = await fetchJToHBadges(robloxId);
      const badgeIds = jtohBadges.map((badge) => badge.id);
      const awardedTowers = await fetchAwardedDates(robloxId, badgeIds);

      if (!awardedTowers?.length) {
        return interaction.editReply(
          `No JToH tower badges found for **${username}**.`
        );
      }

      awardedTowers.sort((a, b) => b.numDifficulty - a.numDifficulty);
      const top10HardestTowers = awardedTowers.slice(0, 10);

      const hardestDifficulty = top10HardestTowers[0]?.difficultyName;
      const embedColor = difficultyColors[hardestDifficulty];
      const embed = new EmbedBuilder()
        .setTitle("The top 10 hardest tower(s)")
        .setColor(embedColor)
        .setThumbnail(avatarUrl)
        .addFields(
          {
            name: "Player",
            value: username,
            inline: true,
          },
          {
            name: "The list of hardest towers",
            value: top10HardestTowers
              .map(
                (tower) =>
                  `**[${difficultyEmojis[tower.difficultyName] || ""}]** ${
                    tower.acronym
                  } (${tower.numDifficulty}) - <t:${Math.floor(
                    new Date(tower.awardedDate).getTime() / 1000
                  )}:R>`
              )
              .join("\n"),
          }
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "An error occurred while executing this command."
      );
    }
  },
};
