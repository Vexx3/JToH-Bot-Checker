const { request } = require("undici");
const redisClient = require("./redis");
require("dotenv").config();

const difficultyOrder = [
  "epic",
  "korn",
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
  "horrific",
  "unreal",
  "nil",
  "gingerbread",
];

const difficultyColors = {
  easy: "#75F347",
  medium: "#FFFE00",
  hard: "#FD7C00",
  difficult: "#FF3232",
  challenging: "#A00000",
  intense: "#19232D",
  remorseless: "#C800C8",
  insane: "#0000FF",
  extreme: "#0389FF",
  terrifying: "#00FFFF",
  catastrophic: "#FFFFFF",
  horrific: "#9695FF",
  unreal: "#5100CB",
  nil: "#65666D",
};

const difficultyEmojis = {
  easy: "<:Easy:1307184531853541446>",
  medium: "<:Medium:1307184770651914251>",
  hard: "<:Hard:1307184941053771877>",
  difficult: "<:Difficult:1307191420179972146>",
  challenging: "<:Challenging:1307191454464217190>",
  intense: "<:Intense:1307191473816731648>",
  remorseless: "<:Remorseless:1307191493911642172>",
  insane: "<:Insane:1307191513381601320>",
  extreme: "<:Extreme:1307191532616683601>",
  terrifying: "<:Terrifying:1307191549829845062>",
  catastrophic: "<:Catastrophic:1307191569736269885>",
  horrific: "<:Horrific:1307191589189193728>",
  unreal: "<:Unreal:1307191608390848532>",
  gingerbread: "<:gingerbread:1309374694721323028>",
  korn: "<:korn:1309374994110742608>",
  nil: "<:nil:1309384772878995467>",
  epic: "<:epic:1309384795318648923>",
  eschaton: "<:Eschaton:1319955405182468156>",
};

async function fetchRobloxAvatar(robloxId) {
  const avatarResponse = await request(
    "https://thumbnails.roproxy.com/v1/users/avatar-headshot",
    {
      method: "GET",
      query: {
        userIds: robloxId,
        size: "60x60",
        format: "Png",
        isCircular: false,
      },
    }
  );

  const avatarUrl =
    "https://static.wikia.nocookie.net/roblox/images/a/a4/Image666.png";
  if (avatarResponse.statusCode === 200) {
    const avatarData = await avatarResponse.body.json();
    if (avatarData.data && avatarData.data.length > 0) {
      return avatarData.data[0].imageUrl || avatarUrl;
    }
  } else {
    console.error(
      `Failed to fetch avatar image: ${
        avatarResponse.statusCode
      } - ${await avatarResponse.body.text()}`
    );
  }

  return avatarUrl;
}

async function fetchRobloxId(username) {
  const response = await request(
    "https://users.roproxy.com/v1/usernames/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username] }),
    }
  );
  const data = await response.body.json();
  return data.data?.[0] ? data.data[0].id : null;
}

async function fetchRobloxUserInfo(robloxId) {
  try {
    const userResponse = await request(
      `https://users.roproxy.com/v1/users/${robloxId}`
    );

    if (userResponse.statusCode === 200) {
      const userData = await userResponse.body.json();
      return {
        id: userData.id,
        name: userData.name,
        displayName: userData.displayName,
        created: userData.created,
        description: userData.description || "No description",
      };
    } else {
      console.error(`Failed to fetch user info: ${userResponse.statusCode}`);
      throw new Error("Error fetching Roblox user information.");
    }
  } catch (error) {
    console.error("Error in fetchRobloxUserInfo:", error);
    throw error;
  }
}

async function fetchAwardedDateForBadge(userId, badgeIds) {
  for (const badgeId of badgeIds) {
    try {
      const response = await request(
        `https://badges.roproxy.com/v1/users/${userId}/badges/${badgeId}/awarded-date`
      );

      if (response.statusCode === 200) {
        const data = await response.body.json();
        if (data.awardedDate) {
          return data;
        }
      } else {
        console.error(
          `Failed to fetch awarded date for badge ${badgeId}: ${
            response.statusCode
          } - ${await response.body.text()}`
        );
      }
    } catch (error) {
      console.error(
        `Error in fetchAwardedDateForBadge for badge ${badgeId}:`,
        error
      );
    }
  }
  return null;
}

const RATE_LIMIT_DELAY = 10000;
const COOLDOWN_DELAY = 1000;

async function fetchAwardedDates(userId, includeEvents = false) {
  const cacheKey = `awardedDates_${userId}:${includeEvents}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const jtohBadges = await fetchBadgeInfo();
  const beatingTowerBadges = jtohBadges.filter(
    (badge) => badge.category === "Beating Tower"
  );

  const badgeIds = beatingTowerBadges
    .flatMap((badge) => [badge.ktohBadgeId, badge.oldBadgeId, badge.badgeId])
    .filter(Boolean);

  const batches = chunkArray(badgeIds, 100);

  const fetchBatchData = async (batch) => {
    let attempts = 0;
    const maxRetries = 5;

    while (attempts < maxRetries) {
      try {
        const awardedDatesResponse = await request(
          `https://badges.roproxy.com/v1/users/${userId}/badges/awarded-dates`,
          { method: "GET", query: { badgeIds: batch.join(",") } }
        );

        if (awardedDatesResponse.statusCode === 200) {
          const awardedDatesData = await awardedDatesResponse.body.json();
          return awardedDatesData.data;
        }

        if (awardedDatesResponse.statusCode === 429) {
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        } else {
          console.error(
            `Unexpected error (Attempt ${attempts + 1}): ${
              awardedDatesResponse.statusCode
            }`
          );
        }
      } catch (error) {
        console.error(
          `Request failed (Attempt ${attempts + 1}): ${error.message}`
        );
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    throw new Error("Failed to fetch awarded dates after multiple attempts.");
  };

  const allAwardedDates = [];
  for (const batch of batches) {
    const batchData = await fetchBatchData(batch);
    allAwardedDates.push(...(batchData || []));
    await new Promise((resolve) => setTimeout(resolve, COOLDOWN_DELAY));
  }

  const towerDifficultyData = await fetchTowerDifficultyData();

  const uniqueBadges = new Set();
  const filteredBadges = allAwardedDates
    .map((awarded) => {
      const matchedJToHBadge = jtohBadges.find(
        (jtohBadge) =>
          jtohBadge.ktohBadgeId === awarded.badgeId ||
          jtohBadge.oldBadgeId === awarded.badgeId ||
          jtohBadge.badgeId === awarded.badgeId
      );

      if (matchedJToHBadge) {
        const towerData = towerDifficultyData.find(
          (tower) => tower.acronym === matchedJToHBadge.acronym
        );

        if (towerData && includeEvents || towerData.locationType !== "event") {
          const badgeKey = matchedJToHBadge.acronym;
          if (!uniqueBadges.has(badgeKey)) {
            uniqueBadges.add(badgeKey);
            return {
              name: matchedJToHBadge.name,
              id: awarded.badgeId,
              acronym: matchedJToHBadge.acronym,
              difficultyName: towerData.difficultyName,
              numDifficulty: towerData.numDifficulty,
              location: towerData.location,
              towerType: towerData.towerType,
              awardedDate: awarded.awardedDate,
            };
          }
        }
      }

      return null;
    })
    .filter(Boolean);

  await redisClient.set(cacheKey, JSON.stringify(filteredBadges), "EX", 180);

  return filteredBadges;
}

async function fetchBadgeInfo() {
  const spreadsheetId = "1Lfd3n0zd5QuVvc3bVRYs_OnTL6loxtaizJNUGmP1AfQ";
  const range = "Info!A2:G";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${process.env.GOOGLE_API}`;

  try {
    const response = await request(url);
    const rows = await response.body.json();
    if (rows.values?.length) {
      return rows.values.map((row) => ({
        badgeId: Number(row[0].replace(/"/g, "")),
        oldBadgeId: Number(row[1]),
        ktohBadgeId: Number(row[2]),
        category: row[5],
        acronym: row[6],
      }));
    } else {
      console.log("No data found in Badge Info.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching badge info:", error);
    return [];
  }
}

async function fetchTowerDifficultyData() {
  const spreadsheetId = "1NOtmaKlU1mIyKGkOZ_5H3rPm1cTVazOvkkZBLPoxy1c";
  const range = "Info!A2:P";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${process.env.GOOGLE_API}`;

  try {
    const response = await request(url);
    const rows = await response.body.json();
    if (rows.values?.length) {
      return rows.values.map((row) => ({
        name: row[0],
        acronym: row[1],
        numDifficulty: parseFloat(row[2]),
        location: row[5],
        difficultyName: row[4],
        locationType: row[6]?.toLowerCase(),
        areaCode: row[7],
        accessible: row[10],
        towerType: row[8],
        creators: row[13],
      }));
    } else {
      console.log("No data found in Tower Difficulty.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching tower difficulty data:", error);
    return [];
  }
}

async function fetchAreaData() {
  const spreadsheetId = "1BlQ7neuwgjaopCWFkYRHX7XKScVZuBrf7ydRbHebtvE";
  const range = "Info!A2:H";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${process.env.GOOGLE_API}`;

  try {
    const response = await request(url);
    const rows = await response.body.json();
    if (rows.values?.length) {
      return rows.values.map((row) => ({
        areaName: row[0],
        acronym: row[3],
      }));
    } else {
      console.log("No data found in Area Difficulty.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching area difficulty data:", error);
    return [];
  }
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

module.exports = {
  difficultyOrder,
  difficultyColors,
  difficultyEmojis,
  fetchRobloxUserInfo,
  fetchRobloxId,
  fetchRobloxAvatar,
  fetchAwardedDates,
  fetchBadgeInfo,
  fetchTowerDifficultyData,
  fetchAreaData,
  fetchAwardedDateForBadge,
};
