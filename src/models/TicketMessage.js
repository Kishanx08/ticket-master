const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  id: String,
  filename: String,
  url: String,
  proxyURL: String,
  size: Number,
  contentType: String,
  width: Number,
  height: Number,
  description: String,
  ephemeral: Boolean
}, { _id: false });

const embedFieldSchema = new mongoose.Schema({
  name: String,
  value: String,
  inline: Boolean
}, { _id: false });

const embedAuthorSchema = new mongoose.Schema({
  name: String,
  url: String,
  iconURL: String,
  proxyIconURL: String
}, { _id: false });

const embedFooterSchema = new mongoose.Schema({
  text: String,
  iconURL: String,
  proxyIconURL: String
}, { _id: false });

const embedSchema = new mongoose.Schema({
  title: String,
  description: String,
  url: String,
  color: Number,
  timestamp: Date,
  thumbnail: {
    url: String,
    proxyURL: String,
    height: Number,
    width: Number
  },
  image: {
    url: String,
    proxyURL: String,
    height: Number,
    width: Number
  },
  video: {
    url: String,
    proxyURL: String,
    height: Number,
    width: Number
  },
  author: embedAuthorSchema,
  fields: [embedFieldSchema],
  footer: embedFooterSchema
}, { _id: false });

const reactionSchema = new mongoose.Schema({
  emoji: {
    id: String,
    name: String,
    animated: Boolean
  },
  count: {
    type: Number,
    default: 1
  },
  users: [{
    type: String,
    required: true
  }]
}, { _id: false });

const messageReferenceSchema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  guildId: String,
  failIfNotExists: Boolean
}, { _id: false });

const stickerItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  format: Number
}, { _id: false });

const messageActivitySchema = new mongoose.Schema({
  type: Number,
  partyId: String
}, { _id: false });

const messageApplicationSchema = new mongoose.Schema({
  id: String,
  coverImage: String,
  description: String,
  icon: String,
  name: String
}, { _id: false });

const messageInteractionSchema = new mongoose.Schema({
  id: String,
  type: Number,
  name: String,
  user: {
    id: String,
    username: String,
    discriminator: String,
    avatar: String
  }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true
  },
  ticketId: {
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
    required: true,
    index: true
  },
  author: {
    id: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    discriminator: {
      type: String,
      required: true
    },
    avatar: String,
    bot: Boolean,
    system: Boolean
  },
  content: {
    type: String,
    default: ''
  },
  cleanContent: String,
  tts: {
    type: Boolean,
    default: false
  },
  nonce: String,
  embeds: [embedSchema],
  components: [mongoose.Schema.Types.Mixed],
  attachments: [attachmentSchema],
  stickers: [stickerItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  editedTimestamp: Date,
  reactions: [reactionSchema],
  mentions: {
    everyone: Boolean,
    users: [String],
    roles: [String],
    channels: [String]
  },
  mentionChannels: [
    {
      id: String,
      guildId: String,
      type: Number,
      name: String
    }
  ],
  pinned: {
    type: Boolean,
    default: false
  },
  type: {
    type: Number,
    required: true
  },
  webhookId: String,
  activity: messageActivitySchema,
  application: messageApplicationSchema,
  applicationId: String,
  reference: messageReferenceSchema,
  flags: [String],
  interaction: messageInteractionSchema,
  thread: {
    id: String,
    name: String,
    type: Number,
    archived: Boolean,
    autoArchiveDuration: Number,
    locked: Boolean,
    rateLimitPerUser: Number
  },
  // Custom fields
  system: {
    type: Boolean,
    default: false
  },
  internal: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
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
messageSchema.index({ ticketId: 1, createdAt: 1 });
messageSchema.index({ 'author.id': 1, createdAt: -1 });
messageSchema.index({ guildId: 1, 'author.id': 1 });
messageSchema.index({ guildId: 1, channelId: 1, createdAt: -1 });

// Virtual for message URL
messageSchema.virtual('url').get(function() {
  return `https://discord.com/channels/${this.guildId}/${this.channelId}/${this.messageId}`;
});

// Pre-save hook to generate clean content
messageSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Simple clean content - in a real app, you'd want to handle markdown, mentions, etc.
    this.cleanContent = this.content
      .replace(/<@!?[0-9]+>/g, '@user')
      .replace(/<#[0-9]+>/g, '#channel')
      .replace(/<@&[0-9]+>/g, '@role')
      .replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '')
      .trim();
  }
  next();
});

// Static methods
messageSchema.statics.findByTicket = function(ticketId, options = {}) {
  const { limit = 50, before = null, after = null } = options;
  
  const query = { ticketId };
  
  if (before) {
    query._id = { $lt: before };
  } else if (after) {
    query._id = { $gt: after };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

messageSchema.statics.getLastMessage = function(ticketId) {
  return this.findOne({ ticketId })
    .sort({ createdAt: -1 })
    .limit(1)
    .lean();
};

messageSchema.statics.getFirstMessage = function(ticketId) {
  return this.findOne({ ticketId })
    .sort({ createdAt: 1 })
    .limit(1)
    .lean();
};

// Instance methods
messageSchema.methods.addReaction = async function(emoji, userId) {
  const emojiId = typeof emoji === 'string' ? emoji : emoji.id || emoji.name;
  
  const reactionIndex = this.reactions.findIndex(r => 
    (r.emoji.id && r.emoji.id === emojiId) || r.emoji.name === emojiId
  );
  
  if (reactionIndex >= 0) {
    // Reaction exists, add user if not already there
    const reaction = this.reactions[reactionIndex];
    if (!reaction.users.includes(userId)) {
      reaction.users.push(userId);
      reaction.count++;
      await this.save();
    }
  } else {
    // New reaction
    const newReaction = {
      emoji: typeof emoji === 'string' ? { name: emoji } : emoji,
      count: 1,
      users: [userId]
    };
    
    this.reactions.push(newReaction);
    await this.save();
  }
  
  return this.save();
};

messageSchema.methods.removeReaction = async function(emoji, userId) {
  const emojiId = typeof emoji === 'string' ? emoji : emoji.id || emoji.name;
  
  const reactionIndex = this.reactions.findIndex(r => 
    (r.emoji.id && r.emoji.id === emojiId) || r.emoji.name === emojiId
  );
  
  if (reactionIndex >= 0) {
    const reaction = this.reactions[reactionIndex];
    const userIndex = reaction.users.indexOf(userId);
    
    if (userIndex >= 0) {
      reaction.users.splice(userIndex, 1);
      reaction.count--;
      
      if (reaction.count <= 0) {
        this.reactions.splice(reactionIndex, 1);
      }
      
      await this.save();
    }
  }
  
  return this.save();
};

module.exports = mongoose.model('TicketMessage', messageSchema);
