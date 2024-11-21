const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require("discord.js");
const {
  difficultyOrder,
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

      const createEmbed = (towers) => {
        const easiestDifficulty = towers[0]?.difficultyName;
        const embedColor = difficultyColors[easiestDifficulty];
        return new EmbedBuilder()
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
                towers.length === 0
                  ? `**${username}** has beaten all towers in JToH!`
                  : towers
                      .map((tower) => {
                        const matchedArea = areaData.find(
                          (currentArea) =>
                            currentArea.acronym === tower.areaCode
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
            }
          );
      };

      const embed = createEmbed(topTowers);

      const sortedDifficulties = [
        ...new Set(unbeatenTowers.map((t) => t.difficultyName)),
      ].sort(
        (a, b) =>
          difficultyOrder.indexOf(a.toLowerCase()) -
          difficultyOrder.indexOf(b.toLowerCase())
      );

      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("filter_difficulty")
          .setPlaceholder("Select a difficulty to filter")
          .addOptions([
            new StringSelectMenuOptionBuilder()
              .setLabel("Show All")
              .setValue("all")
              .setDescription("Reset to default")
              .setEmoji("🔄"),
            ...sortedDifficulties.map((difficulty) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(
                  difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
                )
                .setValue(difficulty)
                .setDescription(`Show only ${difficulty} towers`)
                .setEmoji(difficultyEmojis[difficulty] || null)
            ),
          ])
      );

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [selectMenu],
      });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "filter_difficulty") {
          const selectedDifficulty = i.values[0];

          if (selectedDifficulty === "all") {
            const defaultEmbed = createEmbed(topTowers);
            await i.update({ embeds: [defaultEmbed] });
          } else {
            const filteredTowers = unbeatenTowers
              .filter((tower) => tower.difficultyName === selectedDifficulty)
              .slice(0, 10);

            const filteredEmbed = createEmbed(filteredTowers);
            await i.update({ embeds: [filteredEmbed] });
          }
        }
      });

      collector.on("end", () => {
        selectMenu.components[0].setDisabled(true);
        interaction.editReply({ components: [selectMenu] });
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "An error occurred while executing this command."
      );
    }
  },
};
