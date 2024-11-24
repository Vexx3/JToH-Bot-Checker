const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  robloxId: { type: String, required: true, unique: true },
  totalTowersCompleted: { type: Number, default: 0 },
  hardestTower: {
    name: { type: String, default: null },
    difficulty: { type: String, default: null },
  },
});

module.exports = mongoose.model("User", userSchema);
