const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const { createCanvas } = require("@napi-rs/canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gradient")
    .setDescription(
      "Generates a gradient for a specified number of floors with random colors.",
    )
    .addIntegerOption((option) =>
      option
        .setName("floors")
        .setDescription("The number of floors (5-25). Defaults to 10.")
        .setRequired(false),
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
    let floorCount = interaction.options.getInteger("floors") || 10;
    if (floorCount < 5) floorCount = 5;
    if (floorCount > 25) floorCount = 25;

    const width = 40;
    const height = floorCount * 50;

    const randomColor = () => Math.floor(Math.random() * 256);
    const startColor = { r: randomColor(), g: randomColor(), b: randomColor() };
    const endColor = { r: randomColor(), g: randomColor(), b: randomColor() };

    const interpolate = (start, end, factor) =>
      Math.round(start + (end - start) * factor);

    const colorData = [];
    for (let i = 0; i < floorCount; i++) {
      const factor = i / (floorCount - 1);
      const r = interpolate(startColor.r, endColor.r, factor);
      const g = interpolate(startColor.g, endColor.g, factor);
      const b = interpolate(startColor.b, endColor.b, factor);
      const hex = `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      colorData.push({ floor: i + 1, r, g, b, hex });
    }

    const reversedColorData = [...colorData].reverse();

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const barHeight = height / floorCount;

    reversedColorData.forEach((color, index) => {
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.fillRect(0, index * barHeight, width, barHeight);
    });

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "gradient.png" });

    const embed = new EmbedBuilder()
      .setTitle("Tower Gradient Idea")
      .setColor("#2F3136")
      .setDescription("This is the tower gradient idea with random colors:")
      .setImage("attachment://gradient.png");

    colorData.forEach((color) => {
      embed.addFields({
        name: `Floor ${color.floor}`,
        value: `RGB: \`${color.r}, ${color.g}, ${color.b}\`\nHEX: \`${color.hex}\``,
        inline: true,
      });
    });

    await interaction.reply({ embeds: [embed], files: [attachment] });
  },
};
