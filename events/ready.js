const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    const updateStatus = async () => {
      const serverCount = client.guilds.cache.size;
      const userCount = await client.application
        .fetch()
        .then((app) => app.approximateUserInstallCount);

      const status = `Serving ${serverCount} servers, and ${userCount} installed users`;

      client.user.setActivity({
        type: ActivityType.Custom,
        name: "custom",
        state: status,
      });
    };

    updateStatus();

    setInterval(updateStatus, 180000);
  },
};
