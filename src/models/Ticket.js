const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { 
    type: String, 
    unique: true,
    required: true
  },
  guildId: { 
    type: String, 
    required: true 
  },
  channelId: { 
    type: String, 
    unique: true,
    required: true 
  },
  creator: { 
    id: { type: String, required: true },
    username: { type: String, required: true },
    discriminator: { type: String, required: true },
    avatar: String
  },
  assignedTo: [{
    id: { type: String, required: true },
    username: { type: String, required: true },
    discriminator: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now }
  }],
  category: { 
    type: String, 
    required: true 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'awaiting_client', 'resolved', 'closed', 'on_hold'],
    default: 'open'
  },
  title: { 
    type: String, 
    required: true 
  },
  description: String,
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  tags: { 
    type: [String],
    default: []
  },
  isPrivate: { 
    type: Boolean, 
    default: false 
  },
  closedAt: Date,
  closedBy: String,
  lastActivity: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
ticketSchema.index({ guildId: 1, status: 1 });
ticketSchema.index({ guildId: 1, 'creator.id': 1 });
ticketSchema.index({ guildId: 1, 'assignedTo.id': 1 });
ticketSchema.index({ guildId: 1, lastActivity: -1 });

// Virtual for formatted URL
ticketSchema.virtual('url').get(function() {
  return `https://discord.com/channels/${this.guildId}/${this.channelId}`;
});

// Pre-save hook to generate ticketId
ticketSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ guildId: this.guildId });
    this.ticketId = `${this.guildId}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Method to update last activity
ticketSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Method to close ticket
ticketSchema.methods.close = function(userId) {
  this.status = 'closed';
  this.closedAt = new Date();
  this.closedBy = userId;
  return this.save();
};

// Method to add participant
ticketSchema.methods.addParticipant = function(user) {
  const existing = this.assignedTo.some(p => p.id === user.id);
  if (!existing) {
    this.assignedTo.push({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove participant
ticketSchema.methods.removeParticipant = function(userId) {
  this.assignedTo = this.assignedTo.filter(p => p.id !== userId);
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);
