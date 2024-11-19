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
  fetchTowerDifficultyData,
  fetchAreaData,
  fetchBadgeInfo,
  fetchAwardedDates,
} = require("../../models/utils");

module.exports = {
  cooldown: 20,
  data: new SlashCommandBuilder()
    .setName("unbeatentower")
    .setDescription("Check the easiest unbeaten towers by a user in JToH")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Roblox username")
        .setRequired(true),
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

      if (badgeIds.length === 0) {
        return interaction.editReply(
          `No JToH tower badges found for **${username}**.`,
        );
      }

      const awardedTowers = await fetchAwardedDates(robloxId, badgeIds);

      if (awardedTowers.length === 0) {
        return interaction.editReply(
          `No JToH tower badges found for **${username}**.`,
        );
      }

      const allTowerData = await fetchTowerDifficultyData();
      const areaData = await fetchAreaData();
      const badgeInfo = await fetchBadgeInfo();

      const unbeatenBadges = badgeInfo.filter((badge) => {
        return (
          badge.category === "Beating Tower" &&
          !awardedTowers.some((userBadge) => userBadge.id === badge.badgeId)
        );
      });

      const unbeatenTowers = unbeatenBadges
        .map((badge) => {
          return allTowerData.find((tower) => tower.acronym === badge.acronym);
        })
        .filter((tower) => {
          return tower && tower.locationType !== "event";
        });

      unbeatenTowers.sort((a, b) => a.numDifficulty - b.numDifficulty);
      const topTowers = unbeatenTowers.slice(0, 10);

      const unbeatenTowerDifficulty =
        topTowers[0]?.difficultyName || ":question:";
      const embedColor = difficultyColors[unbeatenTowerDifficulty] || "#58b9ff";
      const embed = new EmbedBuilder()
        .setTitle("The top 10 easiest unbeaten tower(s)")
        .setColor(embedColor)
        .setThumbnail(avatarUrl)
        .addFields(
          {
            name: "Player",
            value: username,
            inline: true,
          },
          {
            name: "List of tower",
            value:
              unbeatenTowers.length === 0
                ? `**${username}** has beaten all towers in JToH!`
                : topTowers
                    .map((tower) => {
                      const matchedArea = areaData.find(
                        (currentArea) => currentArea.acronym === tower.areaCode,
                      );
                      const areaName = matchedArea
                        ? matchedArea.areaName
                        : "Unknown Area";

                      return `**[${
                        difficultyEmojis[tower.difficultyName] || ""
                      }]** ${tower.acronym} (${
                        tower.numDifficulty
                      }) - ${areaName}`;
                    })
                    .join("\n"),
          },
        );

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "An error occurred while executing this command.",
      );
    }
  },
};
