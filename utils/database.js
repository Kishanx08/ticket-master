const mongoose = require('mongoose');
const Guild = require('../models/Guild');
const Ticket = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');
const User = require('../models/User');
const Reminder = require('../models/Reminder');

class Database {
    constructor() {
        this.connection = null;
    }

    async init() {
        try {
            if (!process.env.MONGODB_URI) {
                throw new Error('MONGODB_URI environment variable is not set');
            }
            
            this.connection = await mongoose.connect(process.env.MONGODB_URI);
            
            console.log('Database initialized with MongoDB - Connection successful');
        } catch (error) {
            console.error('Error connecting to MongoDB:', error.message);
            throw error;
        }
    }

    // Guild methods
    async getGuild(guildId) {
        try {
            return await Guild.findById(guildId);
        } catch (error) {
            console.error('Error getting guild:', error);
            return null;
        }
    }

    async saveGuild(guildData) {
        try {
            return await Guild.findByIdAndUpdate(
                guildData._id || guildData.id,
                guildData,
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error('Error saving guild:', error);
            return null;
        }
    }

  // User methods
  async getOrCreateUserByDiscordId(discordId) {
    try {
      let user = await User.findOne({ discordId });
      if (!user) {
        user = new User({ discordId });
        await user.save();
      }
      return user;
    } catch (error) {
      console.error('Error getOrCreateUserByDiscordId:', error);
      return null;
    }
  }

  async toggleSuperAdmin(discordId) {
    try {
      const user = await this.getOrCreateUserByDiscordId(discordId);
      if (!user) return null;
      const newValue = !Boolean(user.isSuperAdmin);
      user.isSuperAdmin = newValue;
      await user.save();
      return user;
    } catch (error) {
      console.error('Error toggling super admin:', error);
      return null;
    }
  }
    

    // Ticket methods
    async getTickets(guildId) {
        try {
            return await Ticket.find({ guildId }).sort({ createdAt: -1 });
        } catch (error) {
            console.error('Error getting tickets:', error);
            return [];
        }
    }

    async getTicket(ticketId) {
        try {
            return await Ticket.findById(ticketId);
        } catch (error) {
            console.error('Error getting ticket:', error);
            return null;
        }
    }

    async getTicketByChannel(channelId) {
        try {
            return await Ticket.findOne({ channelId });
        } catch (error) {
            console.error('Error getting ticket by channel:', error);
            return null;
        }
    }

    async getUserTickets(guildId, userId) {
        try {
            return await Ticket.find({ guildId, userId }).sort({ createdAt: -1 });
        } catch (error) {
            console.error('Error getting user tickets:', error);
            return [];
        }
    }

    async getOpenTickets(guildId) {
        try {
            return await Ticket.find({ 
                guildId, 
                status: { $ne: 'closed' } 
            }).sort({ createdAt: -1 });
        } catch (error) {
            console.error('Error getting open tickets:', error);
            return [];
        }
    }

    async saveTicket(ticketData) {
        try {
            const ticket = new Ticket(ticketData);
            return await ticket.save();
        } catch (error) {
            console.error('Error saving ticket:', error);
            return null;
        }
    }

    async updateTicket(ticketId, updates) {
        try {
            return await Ticket.findByIdAndUpdate(
                ticketId,
                { ...updates, updatedAt: new Date() },
                { new: true }
            );
        } catch (error) {
            console.error('Error updating ticket:', error);
            return null;
        }
    }

    async getNextTicketNumber(guildId) {
        try {
            const latestTicket = await Ticket.findOne({ guildId })
                .sort({ ticketNumber: -1 })
                .select('ticketNumber');
            
            return latestTicket ? latestTicket.ticketNumber + 1 : 1;
        } catch (error) {
            console.error('Error getting next ticket number:', error);
            return 1;
        }
    }

    // Ticket message methods
    async saveTicketMessage(messageData) {
        try {
            const message = new TicketMessage(messageData);
            return await message.save();
        } catch (error) {
            console.error('Error saving ticket message:', error);
            return null;
        }
    }

    async getTicketMessages(ticketId) {
        try {
            return await TicketMessage.find({ ticketId }).sort({ createdAt: 1 });
        } catch (error) {
            console.error('Error getting ticket messages:', error);
            return [];
        }
    }

    // Generate human-readable short ID (3-4 digits)
    generateShortId() {
        // Generate a random number between 1000-9999 (4 digits)
        // This makes it easy to remember and type
        const min = 1000;
        const max = 9999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Reminder methods
    async createReminder(reminderData) {
        try {
            // Generate unique short ID
            let shortId;
            let attempts = 0;
            do {
                shortId = this.generateShortId();
                attempts++;
                if (attempts > 10) {
                    throw new Error('Failed to generate unique short ID');
                }
            } while (await Reminder.findOne({ shortId }));

            reminderData.shortId = shortId;
            const reminder = new Reminder(reminderData);
            return await reminder.save();
        } catch (error) {
            console.error('Error creating reminder:', error);
            return null;
        }
    }

    async getReminder(reminderId) {
        try {
            // Try to find by shortId first (convert to number if it's a string), then by ObjectId
            let reminder;
            const shortIdNum = parseInt(reminderId);
            
            if (!isNaN(shortIdNum)) {
                reminder = await Reminder.findOne({ shortId: shortIdNum });
            }
            if (!reminder) {
                reminder = await Reminder.findById(reminderId);
            }
            
            return reminder;
        } catch (error) {
            console.error('Error getting reminder:', error);
            return null;
        }
    }

    async getReminderByShortId(shortId) {
        try {
            const shortIdNum = parseInt(shortId);
            if (isNaN(shortIdNum)) {
                return null;
            }
            return await Reminder.findOne({ shortId: shortIdNum });
        } catch (error) {
            console.error('Error getting reminder by short ID:', error);
            return null;
        }
    }

    async getUserReminders(userId, guildId = null) {
        try {
            const query = { userId, isActive: true };
            if (guildId) query.guildId = guildId;
            
            return await Reminder.find(query)
                .sort({ triggerTime: 1 })
                .lean();
        } catch (error) {
            console.error('Error getting user reminders:', error);
            return [];
        }
    }

    async getActiveReminders() {
        try {
            return await Reminder.find({ 
                isActive: true, 
                triggerTime: { $lte: new Date() } 
            }).lean();
        } catch (error) {
            console.error('Error getting active reminders:', error);
            return [];
        }
    }

    async getUpcomingReminders(minutes = 5) {
        try {
            const now = new Date();
            const future = new Date(now.getTime() + (minutes * 60 * 1000));
            
            return await Reminder.find({
                isActive: true,
                triggerTime: { $gte: now, $lte: future }
            }).lean();
        } catch (error) {
            console.error('Error getting upcoming reminders:', error);
            return [];
        }
    }

    async updateReminder(reminderId, updates) {
        try {
            return await Reminder.findByIdAndUpdate(
                reminderId,
                { ...updates, updatedAt: new Date() },
                { new: true }
            );
        } catch (error) {
            console.error('Error updating reminder:', error);
            return null;
        }
    }

    async deleteReminder(reminderId) {
        try {
            return await Reminder.findByIdAndDelete(reminderId);
        } catch (error) {
            console.error('Error deleting reminder:', error);
            return null;
        }
    }

    async markReminderCompleted(reminderId) {
        try {
            return await Reminder.findByIdAndDelete(reminderId);
        } catch (error) {
            console.error('Error marking reminder as completed:', error);
            return null;
        }
    }

    async snoozeReminder(reminderId, newTriggerTime) {
        try {
            return await Reminder.findByIdAndUpdate(
                reminderId,
                { 
                    triggerTime: newTriggerTime,
                    isSnoozed: true,
                    snoozeCount: { $inc: 1 },
                    updatedAt: new Date()
                },
                { new: true }
            );
        } catch (error) {
            console.error('Error snoozing reminder:', error);
            return null;
        }
    }

    async createRepeatingReminder(originalReminderId, newTriggerTime) {
        try {
            const originalReminder = await Reminder.findById(originalReminderId);
            if (!originalReminder) return null;

            const newReminder = new Reminder({
                ...originalReminder.toObject(),
                _id: new mongoose.Types.ObjectId(),
                triggerTime: newTriggerTime,
                isSnoozed: false,
                parentReminderId: originalReminderId,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            return await newReminder.save();
        } catch (error) {
            console.error('Error creating repeating reminder:', error);
            return null;
        }
    }

    async cleanupOldReminders() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const result = await Reminder.deleteMany({
                isActive: false,
                updatedAt: { $lt: thirtyDaysAgo }
            });
            
            console.log(`Cleaned up ${result.deletedCount} old reminders`);
            return result.deletedCount;
        } catch (error) {
            console.error('Error cleaning up old reminders:', error);
            return 0;
        }
    }

    async backup() {
        console.log('Database backup not needed - using MongoDB Atlas/Cloud');
        return true;
    }
}

module.exports = new Database();