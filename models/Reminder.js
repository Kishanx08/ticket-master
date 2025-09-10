const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  guildId: { 
    type: String, 
    required: true, 
    index: true 
  },
  channelId: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 2000 
  },
  triggerTime: { 
    type: Date, 
    required: true,
    index: true 
  },
  originalTime: { 
    type: String, 
    required: true 
  },
  timezone: { 
    type: String, 
    default: 'UTC' 
  },
  isRepeating: { 
    type: Boolean, 
    default: false 
  },
  repeatInterval: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    default: null 
  },
  customRepeatPattern: { 
    type: String, 
    default: null 
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  isSnoozed: { 
    type: Boolean, 
    default: false 
  },
  snoozeCount: { 
    type: Number, 
    default: 0 
  },
  parentReminderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Reminder',
    default: null 
  },
  shortId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
reminderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient querying
reminderSchema.index({ userId: 1, isActive: 1 });
reminderSchema.index({ triggerTime: 1, isActive: 1 });
reminderSchema.index({ guildId: 1, isActive: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
