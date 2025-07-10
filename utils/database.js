const mongoose = require('mongoose');
const Guild = require('../models/Guild');
const Ticket = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');

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

    async backup() {
        console.log('Database backup not needed - using MongoDB Atlas/Cloud');
        return true;
    }
}

module.exports = new Database();