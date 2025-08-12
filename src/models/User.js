const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Discord user ID
  username: { type: String, required: true },
  discriminator: { type: String },
  avatar: { type: String },
  isSuperAdmin: { type: Boolean, default: false },
  ticketPermissions: [{
    guildId: { type: String, required: true },
    canCreate: { type: Boolean, default: true },
    canView: { type: Boolean, default: true },
    canManage: { type: Boolean, default: false },
    categories: [{
      categoryId: { type: String, required: true },
      canView: { type: Boolean, default: true },
      canManage: { type: Boolean, default: false },
    }],
  }],
  notificationPreferences: {
    ticketCreated: { type: Boolean, default: true },
    ticketUpdated: { type: Boolean, default: true },
    ticketClosed: { type: Boolean, default: true },
    ticketReopened: { type: Boolean, default: true },
    ticketClaimed: { type: Boolean, default: true },
    ticketMessage: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: false },
    emailAddress: { type: String },
  },
  stats: {
    ticketsCreated: { type: Number, default: 0 },
    ticketsClosed: { type: Number, default: 0 },
    ticketsClaimed: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 }, // in minutes
    lastActive: { type: Date },
  },
  blacklisted: {
    isBlacklisted: { type: Boolean, default: false },
    reason: { type: String },
    blacklistedBy: { type: String },
    blacklistedAt: { type: Date },
    expiresAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for faster lookups
userSchema.index({ _id: 1 });
userSchema.index({ 'ticketPermissions.guildId': 1 });
userSchema.index({ 'blacklisted.isBlacklisted': 1 });
userSchema.index({ 'blacklisted.expiresAt': 1 });

// Static method to find or create a user
exists
userSchema.statics.findOrCreate = async function(discordUser) {
  let user = await this.findById(discordUser.id);
  
  if (!user) {
    user = new this({
      _id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatar: discordUser.avatar,
    });
    await user.save();
  } else {
    // Update user information if it has changed
    const needsUpdate = 
      user.username !== discordUser.username ||
      user.discriminator !== discordUser.discriminator ||
      user.avatar !== discordUser.avatar;
    
    if (needsUpdate) {
      user.username = discordUser.username;
      user.discriminator = discordUser.discriminator;
      user.avatar = discordUser.avatar;
      await user.save();
    }
  }
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
