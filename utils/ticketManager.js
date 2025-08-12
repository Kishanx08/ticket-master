const database = require('./database');

class TicketManager {
    constructor() {
        this.db = database;
    }

    async createTicket(ticketData) {
        const ticketNumber = await this.db.getNextTicketNumber(ticketData.guildId);
        
        const ticket = {
            ticketNumber,
            guildId: ticketData.guildId,
            userId: ticketData.userId,
            channelId: ticketData.channelId,
            ticketType: ticketData.ticketType || 'website',
            status: 'open',
            title: ticketData.title || `Ticket #${ticketNumber}`,
            description: ticketData.description || null,
            responses: ticketData.responses || []
        };

        return await this.db.saveTicket(ticket);
    }

    async getTicketByChannel(channelId) {
        return await this.db.getTicketByChannel(channelId);
    }

    async getTicketById(id) {
        return await this.db.getTicket(id);
    }

    // REMOVED: getUserActiveTicket - users can now have multiple tickets
    
    async closeTicket(ticketId, closedBy) {
        return await this.db.updateTicket(ticketId, {
            status: 'closed',
            closedAt: new Date(),
            closedBy: closedBy
        });
    }

    async updateTicketStatus(ticketId, status) {
        return await this.db.updateTicket(ticketId, {
            status: status
        });
    }

    async getNextTicketNumber(guildId) {
        return await this.db.getNextTicketNumber(guildId);
    }

    async getAllTickets(guildId) {
        return await this.db.getTickets(guildId);
    }

    async getUserTickets(guildId, userId) {
        return await this.db.getUserTickets(guildId, userId);
    }

    async getOpenTickets(guildId) {
        return await this.db.getOpenTickets(guildId);
    }

    async getClosedTickets(guildId) {
        const allTickets = await this.db.getTickets(guildId);
        return allTickets.filter(ticket => ticket.status === 'closed');
    }

    async getUserTickets(userId) {
        const tickets = await this.db.getTickets();
        return tickets.filter(ticket => ticket.userId === userId);
    }

    async getOpenTickets() {
        const tickets = await this.db.getTickets();
        return tickets.filter(ticket => ticket.status === 'open');
    }

    async getClosedTickets() {
        const tickets = await this.db.getTickets();
        return tickets.filter(ticket => ticket.status === 'closed');
    }
}

module.exports = new TicketManager();
