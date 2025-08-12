const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  ticketCategory: { type: String, default: null },
  logChannel: { type: String, default: null },
  staffRoles: [{ type: String }],
  ticketCounter: { type: Number, default: 1 },
  ticketSettings: {
    maxTicketsPerUser: { type: Number, default: 3 },
    autoCloseInactiveTickets: { type: Boolean, default: false },
    inactiveTicketDays: { type: Number, default: 7 },
    saveTranscripts: { type: Boolean, default: true },
    transcriptChannel: { type: String, default: null },
    notificationChannel: { type: String, default: null },
    defaultCategory: { type: String, default: 'support' },
    ticketPrefix: { type: String, default: 'ticket' },
  },
  categories: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    emoji: { type: String, default: '🎫' },
    staffRoles: [{ type: String }],
    requiredPermissions: [{ type: String }],
    questions: [{
      id: { type: String, required: true },
      label: { type: String, required: true },
      placeholder: { type: String, default: '' },
      style: { type: String, default: 'SHORT', enum: ['SHORT', 'PARAGRAPH'] },
      required: { type: Boolean, default: true },
      minLength: { type: Number, default: 1 },
      maxLength: { type: Number, default: 1000 },
    }],
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt timestamp before saving
guildSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create a compound index for faster lookups
guildSchema.index({ _id: 1, 'categories.id': 1 });

const Guild = mongoose.model('Guild', guildSchema);

module.exports = Guild;
