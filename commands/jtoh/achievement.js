const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const { createCanvas, registerFont } = require("@napi-rs/canvas");
const Chart = require("chart.js/auto");
const path = require("path");
const {
  fetchRobloxId,
  fetchRobloxAvatar,
  fetchAwardedDates,
  fetchJToHBadges,
  difficultyColors,
} = require("../../models/utils");

registerFont(path.join(__dirname, "../../fonts/OpenSans-Regular.ttf"), {
  family: "Open Sans",
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("achievement")
    .setDescription("Displays the achievements of a user in JToH")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Roblox username")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("cumulative")
        .setDescription("Display cumulative chart")
        .setRequired(false)
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
    const cumulative = interaction.options.getBoolean("cumulative") || false;

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

    const achievements = awardedTowers.reduce((acc, tower) => {
      const date = new Date(tower.awardedDate);
      const month = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      if (!acc[month]) {
        acc[month] = {};
      }
      if (!acc[month][tower.difficultyName]) {
        acc[month][tower.difficultyName] = 0;
      }
      acc[month][tower.difficultyName] += 1;
      return acc;
    }, {});

    const sortedMonths = Object.keys(achievements).sort();
    const labels = sortedMonths;
    const datasets = Object.keys(difficultyColors).map((difficulty) => {
      return {
        label: difficulty,
        data: sortedMonths.map((month) => achievements[month][difficulty] || 0),
        backgroundColor: difficultyColors[difficulty],
        borderColor: difficultyColors[difficulty],
        borderWidth: 2,
        fill: cumulative ? true : false,
        pointRadius: 0,
      };
    });

    if (cumulative) {
      datasets.forEach((dataset) => {
        for (let i = 1; i < dataset.data.length; i++) {
          dataset.data[i] += dataset.data[i - 1];
        }
      });
    }

    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    new Chart(ctx, {
      type: cumulative ? "line" : "bar",
      data: {
        labels,
        datasets,
      },
      options: {
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: `Achievements of ${username}`,
            position: "top",
            color: "#ffffff",
            font: {
              size: 14,
              family: "Open Sans",
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            stacked: true,
            ticks: {
              color: "#ffffff",
              font: {
                size: 14,
                family: "Open Sans",
              },
            },
            title: {
              display: true,
              text: "Number of towers beaten",
              color: "#ffffff",
              font: {
                size: 14,
                family: "Open Sans",
              },
            },
          },
          x: {
            stacked: true,
            ticks: {
              color: "#ffffff",
              font: {
                size: 14,
                family: "Open Sans",
              },
            },
            title: {
              display: true,
              text: "Date",
              color: "#ffffff",
              font: {
                size: 14,
                family: "Open Sans",
              },
            },
          },
        },
      },
      plugins: [
        {
          beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext("2d");
            ctx.save();
            ctx.globalCompositeOperation = "destination-over";
            ctx.fillStyle = "#2C2F33";
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
          },
        },
        {
          afterDraw: (chart) => {
            const ctx = chart.canvas.getContext("2d");
            const chartArea = chart.chartArea;
            ctx.save();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              chartArea.left,
              chartArea.top,
              chartArea.right - chartArea.left,
              chartArea.bottom - chartArea.top
            );
            ctx.restore();
          },
        },
      ],
    });

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, {
      name: "achievement.png",
    });

    const embed = new EmbedBuilder()
      .setTitle(`Achievements for ${username}`)
      .setColor("#58b9ff")
      .setDescription(`Chart Type: ${cumulative ? "Cumulative" : "Monthly"}`)
      .setThumbnail(avatarUrl)
      .setImage("attachment://achievement.png")
      .setFooter({ text: "Click on the image to enlarge" });

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  },
};
