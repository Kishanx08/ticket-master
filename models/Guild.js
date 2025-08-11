const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  config: {
    type: Object,
    default: {
      setupEmbed: {
        title: "Create Support Ticket",
        description: "Click the button below to create a support ticket. Our team will respond as soon as possible.",
        color: "#0099ff",
        footer: "Support Team"
      },
      ticketTypes: [
        {
          id: "website",
          name: "Order Website",
          emoji: "🌐",
          description: "Request a new website",
          questions: [
            "What type of website do you need?",
            "What's your budget range?",
            "When do you need it completed?"
          ]
        },
        {
          id: "support",
          name: "Existing Project Support",
          emoji: "🔧",
          description: "Get help with an existing project",
          questions: [
            "What project needs support?",
            "What issue are you experiencing?",
            "How urgent is this issue?"
          ]
        }
      ],
      statusMessages: {
        "in_progress": "Your ticket is now being worked on.",
        "awaiting_client": "We're waiting for your response.",
        "testing": "Your project is being tested.",
        "completed": "Your ticket has been completed!"
      },
      colors: {
        "open": "#00ff00",
        "in_progress": "#ffff00",
        "awaiting_client": "#ff9900",
        "testing": "#9900ff",
        "completed": "#0099ff",
        "closed": "#ff0000"
      },
      messages: {
        "welcome": "Thank you for creating a ticket! Our team will be with you shortly.",
        "closed": "This ticket has been closed. Thank you for contacting us!"
      }
    }
  },
  supportRoleId: String,
  logChannelId: String,
  logs: {
    type: Object,
    default: {
      message: true,
      voice: true,
      roles: true,
      channels: true,
      members: true,
    }
  },
  archiveCategoryId: String,
  autoRoleId: String,
  onboardConfig: {
    channelId: String,
    message: String,
    seconds: Number
  }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model('Guild', guildSchema);