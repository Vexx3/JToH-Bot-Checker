const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const {
  difficultyEmojis,
  fetchRobloxAvatar,
  fetchRobloxId,
  fetchJToHBadges,
  fetchTowerDifficultyData,
  fetchBadgeInfo,
  fetchAwardedDates,
} = require("../../models/utils");

module.exports = {
  cooldown: 20,
  data: new SlashCommandBuilder()
    .setName("towercompletion")
    .setDescription("Displays the tower completion stats for a user in JToH")
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

      const badgeInfo = await fetchBadgeInfo();
      const towerData = await fetchTowerDifficultyData();

      const totalDifficultyCounts = {};

      const filteredTowerData = towerData.filter(
        (tower) =>
          tower.locationType !== "event" && tower.towerType !== "MiniTower",
      );

      badgeInfo
        .filter((badge) => badge.category === "Beating Tower")
        .forEach((badge) => {
          const tower = filteredTowerData.find(
            (t) => t.acronym === badge.acronym && t.difficultyName,
          );
          if (tower) {
            totalDifficultyCounts[tower.difficultyName] =
              (totalDifficultyCounts[tower.difficultyName] || 0) + 1;
          }
        });

      const totalTowersInGame = Object.values(totalDifficultyCounts).reduce(
        (sum, count) => sum + count,
        0,
      );

      const towerCounts = {
        towers: 0,
        citadels: 0,
        steeples: 0,
      };

      const locationPoints = {
        Ring: 0,
        Zone: 0,
      };

      const difficultyCounts = {};

      awardedTowers.forEach((badge) => {
        const points =
          badge.towerType === "Citadel"
            ? 2
            : badge.towerType === "Steeple"
              ? 0.5
              : 1;

        towerCounts[badge.towerType.toLowerCase() + "s"] += 1;

        if (badge.location === "ring") {
          locationPoints.Ring += points;
        } else if (badge.location === "zone") {
          locationPoints.Zone += points;
        }

        if (!difficultyCounts[badge.difficultyName]) {
          difficultyCounts[badge.difficultyName] = 0;
        }
        difficultyCounts[badge.difficultyName] += 1;
      });

      const totalTowersCompleted =
        towerCounts.towers + towerCounts.citadels + towerCounts.steeples;

      const totalCompletionPercentage = Math.round(
        (totalTowersCompleted / totalTowersInGame) * 100,
      );

      const difficultyOrder = [
        "easy",
        "medium",
        "hard",
        "difficult",
        "challenging",
        "intense",
        "remorseless",
        "insane",
        "extreme",
        "terrifying",
        "catastrophic",
      ];

      const difficultyFields = difficultyOrder
        .filter((difficulty) => difficultyCounts[difficulty])
        .map((difficulty) => {
          const completed = difficultyCounts[difficulty] || 0;
          const total = totalDifficultyCounts[difficulty];
          const percentage = Math.round((completed / total) * 100);
          return `**[${
            difficultyEmojis[difficulty] || ""
          }]** - ${completed}/${total} (${percentage}%)`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("Tower completion")
        .setColor("#58b9ff")
        .setThumbnail(avatarUrl)
        .addFields(
          { name: "Player", value: username, inline: true },
          {
            name: "Total completion",
            value: `${totalTowersCompleted}/${totalTowersInGame} (${totalCompletionPercentage}%)`,
          },
          {
            name: "Total positive energies",
            value: `Ring: ${locationPoints.Ring}\nZone: ${locationPoints.Zone}`,
          },
          {
            name: "Tower type",
            value: `Towers: ${towerCounts.towers}\nCitadels: ${towerCounts.citadels}\nSteeples: ${towerCounts.steeples}`,
          },
          {
            name: "Difficulty",
            value: difficultyFields || "No towers completed yet.",
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
