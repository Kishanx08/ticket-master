const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true, index: true },
  isSuperAdmin: { type: Boolean, default: false },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);

