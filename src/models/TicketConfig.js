const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'select', 'multi-select', 'number', 'boolean', 'textarea'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  placeholder: String,
  options: [{
    label: String,
    value: String,
    emoji: String
  }],
  default: mongoose.Schema.Types.Mixed,
  minLength: Number,
  maxLength: Number,
  validation: String, // regex pattern
  helpText: String
}, { _id: false });

const categorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  emoji: String,
  color: {
    type: String,
    default: '#5865F2'
  },
  staffRoles: [{
    type: String,
    required: true
  }],
  form: [formFieldSchema],
  channelName: {
    type: String,
    default: 'ticket-{number}'
  },
  welcomeMessage: {
    type: String,
    default: 'Thank you for creating a ticket! A staff member will assist you shortly.'
  },
  enabled: {
    type: Boolean,
    default: true
  },
  requireThread: {
    type: Boolean,
    default: false
  },
  autoClose: {
    enabled: {
      type: Boolean,
      default: false
    },
    inactiveDays: {
      type: Number,
      default: 7,
      min: 1
    },
    notifyBefore: {
      type: Number,
      default: 24, // hours
      min: 1
    }
  }
}, { _id: false });

const ticketConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  categories: [categorySchema],
  defaultCategory: String,
  staffRoles: [String],
  adminRoles: [String],
  notificationChannel: String,
  logChannel: String,
  archiveCategory: String,
  archiveAfterDays: {
    type: Number,
    default: 30,
    min: 1
  },
  transcript: {
    enabled: {
      type: Boolean,
      default: true
    },
    saveLocally: {
      type: Boolean,
      default: true
    },
    webhook: String,
    format: {
      type: String,
      enum: ['json', 'html', 'txt'],
      default: 'html'
    }
  },
  mentions: {
    onOpen: [String], // role or user IDs
    onUpdate: [String],
    onClose: [String]
  },
  permissions: {
    viewTickets: [String],
    manageTickets: [String],
    deleteTickets: [String],
    viewTranscripts: [String]
  },
  messages: {
    ticketCreated: String,
    ticketClosed: String,
    ticketReopened: String,
    ticketDeleted: String,
    ticketRenamed: String,
    ticketLocked: String,
    ticketUnlocked: String
  },
  autoResponses: [{
    trigger: String, // regex pattern
    response: String,
    enabled: Boolean
  }],
  blacklist: [{
    userId: String,
    reason: String,
    expiresAt: Date,
    moderator: String
  }],
  features: {
    autoClose: {
      enabled: Boolean,
      daysInactive: Number
    },
    autoResponse: {
      enabled: Boolean
    },
    transcripts: {
      enabled: Boolean
    },
    feedback: {
      enabled: Boolean,
      questions: [String]
    },
    ratings: {
      enabled: Boolean,
      scale: {
        type: Number,
        min: 3,
        max: 10,
        default: 5
      }
    }
  },
  limits: {
    maxTicketsPerUser: {
      type: Number,
      default: 3,
      min: 1
    },
    ticketNameLength: {
      min: 1,
      max: 100,
      default: 50
    },
    messageLength: {
      min: 1,
      max: 2000,
      default: 1000
    }
  },
  ui: {
    color: {
      primary: {
        type: String,
        default: '#5865F2'
      },
      success: {
        type: String,
        default: '#57F287'
      },
      warning: {
        type: String,
        default: '#FEE75C'
      },
      danger: {
        type: String,
        default: '#ED4245'
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'dark'
    },
    showTimestamps: {
      type: Boolean,
      default: true
    },
    showUserAvatars: {
      type: Boolean,
      default: true
    },
    compactMode: {
      type: Boolean,
      default: false
    }
  },
  integrations: {
    webhooks: [{
      name: String,
      url: String,
      events: [String],
      enabled: Boolean
    }],
    apiKeys: [{
      name: String,
      key: String,
      permissions: [String],
      expiresAt: Date,
      lastUsed: Date
    }]
  },
  advanced: {
    debug: {
      type: Boolean,
      default: false
    },
    cache: {
      enabled: {
        type: Boolean,
        default: true
      },
      ttl: {
        type: Number,
        default: 300 // 5 minutes
      }
    },
    rateLimiting: {
      enabled: {
        type: Boolean,
        default: true
      },
      max: {
        type: Number,
        default: 5
      },
      window: {
        type: Number,
        default: 60 // seconds
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: String
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

// Indexes
ticketConfigSchema.index({ guildId: 1 }, { unique: true });

// Methods
ticketConfigSchema.methods.getCategory = function(categoryId) {
  return this.categories.find(cat => cat.id === categoryId || cat.name.toLowerCase() === categoryId.toLowerCase());
};

ticketConfigSchema.methods.addCategory = function(categoryData) {
  this.categories.push(categoryData);
  if (!this.defaultCategory) {
    this.defaultCategory = categoryData.id;
  }
  return this.save();
};

ticketConfigSchema.methods.updateCategory = function(categoryId, updates) {
  const category = this.getCategory(categoryId);
  if (!category) return null;
  
  Object.assign(category, updates);
  return this.save();
};

ticketConfigSchema.methods.removeCategory = function(categoryId) {
  const index = this.categories.findIndex(cat => cat.id === categoryId || cat.name.toLowerCase() === categoryId.toLowerCase());
  if (index === -1) return null;
  
  this.categories.splice(index, 1);
  
  // Update default category if needed
  if (this.defaultCategory === categoryId) {
    this.defaultCategory = this.categories[0]?.id || null;
  }
  
  return this.save();
};

// Static methods
ticketConfigSchema.statics.getConfig = async function(guildId) {
  let config = await this.findOne({ guildId });
  
  if (!config) {
    config = new this({
      guildId,
      // Default categories
      categories: [
        {
          id: 'support',
          name: 'Support',
          description: 'Get help with general questions',
          emoji: '❓',
          staffRoles: [],
          form: []
        },
        {
          id: 'bug',
          name: 'Bug Report',
          description: 'Report a bug or issue',
          emoji: '🐛',
          staffRoles: [],
          form: [
            {
              id: 'steps',
              label: 'Steps to Reproduce',
              type: 'textarea',
              required: true,
              placeholder: '1. Do this\n2. Then this\n3. Error occurs'
            },
            {
              id: 'expected',
              label: 'Expected Behavior',
              type: 'text',
              required: true
            },
            {
              id: 'actual',
              label: 'Actual Behavior',
              type: 'text',
              required: true
            },
            {
              id: 'screenshot',
              label: 'Screenshot/Video',
              type: 'text',
              required: false,
              helpText: 'Please provide a link to a screenshot or video of the issue'
            }
          ]
        }
      ]
    });
    
    await config.save();
  }
  
  return config;
};

module.exports = mongoose.model('TicketConfig', ticketConfigSchema);
