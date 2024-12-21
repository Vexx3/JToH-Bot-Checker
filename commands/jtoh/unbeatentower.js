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
  fetchTowerDifficultyData,
  fetchAreaData,
  fetchBadgeInfo,
  fetchAwardedDates,
} = require("../../models/utils");

module.exports = {
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

    const allTowerData = await fetchTowerDifficultyData();
    const areaData = await fetchAreaData();
    const badgeInfo = await fetchBadgeInfo();

    const unbeatenBadges = badgeInfo.filter((badge) => {
      return (
        badge.category === "Beating Tower" &&
        !awardedTowers.some(
          (userBadge) =>
            userBadge.id === badge.ktohBadgeId ||
            userBadge.id === badge.oldBadgeId ||
            userBadge.id === badge.badgeId
        )
      );
    });

    const unbeatenTowers = unbeatenBadges
      .map((badge) => {
        return allTowerData.find((tower) => tower.acronym === badge.acronym);
      })
      .filter((tower) => {
        return tower && tower.locationType !== "event";
      });

      unbeatenTowers.sort((a, b) => {
        const diffA = a.numDifficulty ?? Infinity;
        const diffB = b.numDifficulty ?? Infinity;
        return diffA - diffB;
      });
      const topTowers = unbeatenTowers.slice(0, 10);

    const createEmbed = (towers) => {
      const easiestDifficulty = towers[0]?.difficultyName;
      const embedColor = difficultyColors[easiestDifficulty] || "#99AAb5";
      return new EmbedBuilder()
        .setTitle(`10 easiest unbeaten tower(s) for ${username}`)
        .setColor(embedColor)
        .setThumbnail(avatarUrl)
        .addFields({
          name: "List of tower",
          value:
            towers.length === 0
              ? `**${username}** has beaten all towers in JToH! <a:yep:1310264052202868797>`
              : towers
                  .map((tower) => {
                    const matchedArea = areaData.find(
                      (currentArea) => currentArea.acronym === tower.areaCode
                    );
                    const areaName = matchedArea
                      ? matchedArea.areaName
                      : "Unknown Area";

                    return `**[${
                      difficultyEmojis[tower.difficultyName] || tower.difficultyName
                    }]** ${tower.acronym} (${
                      tower.numDifficulty
                    }) - ${areaName}`;
                  })
                  .join("\n"),
        });
    };

    const embed = createEmbed(topTowers);

    const sortedDifficulties = [
      ...new Set(unbeatenTowers.map((t) => t.difficultyName)),
    ];
    
    const difficultiesInOrder = sortedDifficulties.filter((difficulty) =>
      difficultyOrder.includes(difficulty.toLowerCase())
    );
    
    const difficultiesNotInOrder = sortedDifficulties.filter(
      (difficulty) => !difficultyOrder.includes(difficulty.toLowerCase())
    );
    
    difficultiesInOrder.sort(
      (a, b) =>
        difficultyOrder.indexOf(a.toLowerCase()) -
        difficultyOrder.indexOf(b.toLowerCase())
    );
    
    const allSortedDifficulties = [...difficultiesInOrder, ...difficultiesNotInOrder];

    const createSelectMenu = (selectedDifficulty) => {
      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("filter_difficulty")
          .setPlaceholder("Select a difficulty to filter")
          .addOptions([
            new StringSelectMenuOptionBuilder()
              .setLabel("Show All")
              .setValue("all")
              .setDescription("Reset to default")
              .setEmoji("🔄")
              .setDefault(selectedDifficulty === "all"),
            ...allSortedDifficulties.map((difficulty) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(
                  difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
                )
                .setValue(difficulty)
                .setDescription(`Show only ${difficulty} towers`)
                .setEmoji(difficultyEmojis[difficulty.toLowerCase()] || null)
                .setDefault(selectedDifficulty === difficulty)
            ),
          ])
      );
    };

    let lastSelectedDifficulty = "all";

    const reply = await interaction.editReply({
      embeds: [embed],
      components: [createSelectMenu(lastSelectedDifficulty)],
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "filter_difficulty") {
        await i.deferUpdate();

        lastSelectedDifficulty = i.values[0];

        if (lastSelectedDifficulty === "all") {
          const defaultEmbed = createEmbed(topTowers);
          await i.editReply({
            embeds: [defaultEmbed],
            components: [createSelectMenu(lastSelectedDifficulty)],
          });
        } else {
          const filteredTowers = unbeatenTowers
            .filter((tower) => tower.difficultyName === lastSelectedDifficulty)
            .slice(0, 10);

          const filteredEmbed = createEmbed(filteredTowers);
          await i.editReply({
            embeds: [filteredEmbed],
            components: [createSelectMenu(lastSelectedDifficulty)],
          });
        }
      }
    });

    collector.on("end", () => {
      const disabledSelectMenu = createSelectMenu(lastSelectedDifficulty);
      disabledSelectMenu.components[0].setDisabled(true);
      interaction.editReply({ components: [disabledSelectMenu] });
    });
  },
};
