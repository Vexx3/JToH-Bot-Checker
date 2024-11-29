const { Events, ActivityType, ClientApplication } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    const serverCount = ClientApplication.approximateGuildCount;
    const userCount = ClientApplication.approximateUserCount;

    const status = `Serving ${serverCount} servers and ${userCount} installed users`;

    client.user.setActivity({
      type: ActivityType.Custom,
      name: "custom",
      state: status,
    });
  },
};
