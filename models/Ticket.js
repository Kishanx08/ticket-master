const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: Number,
    required: true
  },
  guildId: {
    type: String,
    required: true,
    ref: 'Guild'
  },
  userId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true,
    unique: true
  },
  ticketType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'open',
    enum: ['open', 'in_progress', 'awaiting_client', 'testing', 'completed', 'closed', 'on_hold']
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  responses: [{
    question: String,
    answer: String
  }],
  closedAt: Date,
  closedBy: String
}, {
  timestamps: true
});

// Create compound index for guild and ticket number
ticketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', ticketSchema);