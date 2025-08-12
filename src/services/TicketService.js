const Ticket = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');
const TicketConfig = require('../models/TicketConfig');

class TicketService {
  constructor(client) {
    this.client = client;
    this.cache = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  // Core ticket operations
  async createTicket(options) {
    const { guildId, creator, category, title, description = '', formData = {}, tags = [], priority = 'medium' } = options;
    
    const config = await TicketConfig.getConfig(guildId);
    const categoryConfig = config.getCategory(category);
    
    if (!categoryConfig) throw new Error('Invalid ticket category');

    // Check ticket limit
    const userTicketCount = await Ticket.countDocuments({
      guildId,
      'creator.id': creator.id,
      status: { $ne: 'closed' }
    });

    const maxTickets = config.limits?.maxTicketsPerUser || 3;
    if (userTicketCount >= maxTickets) {
      throw new Error(`You can only have ${maxTickets} open tickets at a time.`);
    }

    // Create ticket
    const ticket = new Ticket({
      guildId,
      creator: {
        id: creator.id,
        username: creator.username,
        discriminator: creator.discriminator,
        avatar: creator.avatar
      },
      category,
      title: title.substring(0, config.limits?.ticketNameLength?.default || 100),
      description: description.substring(0, config.limits?.messageLength?.default || 2000),
      priority,
      customFields: formData,
      tags,
      status: 'open'
    });

    await ticket.save();
    return ticket;
  }

  async closeTicket(ticketId, closerId, reason = 'No reason provided') {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status === 'closed') throw new Error('Ticket is already closed');

    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = closerId;
    await ticket.save();

    return ticket;
  }

  // Participant management
  async addParticipant(ticketId, userId, adderId) {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.assignedTo.some(p => p.id === userId)) {
      throw new Error('User is already a participant');
    }

    const user = await this.client.users.fetch(userId).catch(() => {
      throw new Error('User not found');
    });

    ticket.assignedTo.push({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator
    });

    await ticket.save();
    return ticket;
  }

  async removeParticipant(ticketId, userId, removerId) {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.creator.id === userId) throw new Error('Cannot remove ticket creator');

    const initialLength = ticket.assignedTo.length;
    ticket.assignedTo = ticket.assignedTo.filter(p => p.id !== userId);
    
    if (ticket.assignedTo.length === initialLength) {
      throw new Error('User is not a participant');
    }

    await ticket.save();
    return ticket;
  }

  // Status management
  async updateStatus(ticketId, status, updaterId) {
    const validStatuses = ['open', 'in_progress', 'awaiting_client', 'resolved', 'on_hold', 'closed'];
    if (!validStatuses.includes(status)) throw new Error('Invalid status');

    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) throw new Error('Ticket not found');

    const oldStatus = ticket.status;
    ticket.status = status;
    
    if (status === 'closed') {
      ticket.closedAt = new Date();
      ticket.closedBy = updaterId;
    }

    await ticket.save();
    return ticket;
  }

  // Message handling
  async addMessage(ticketId, messageData) {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) throw new Error('Ticket not found');

    const message = new TicketMessage({
      ...messageData,
      ticketId,
      guildId: ticket.guildId,
      channelId: ticket.channelId
    });

    await message.save();

    // Update last activity
    ticket.lastActivity = new Date();
    await ticket.save();

    return message;
  }

  // Query methods
  async getTicket(ticketId, options = {}) {
    return await Ticket.findOne({ ticketId }).populate(options.populate || '');
  }

  async getTicketsByUser(guildId, userId, options = {}) {
    const query = { guildId, 'creator.id': userId };
    if (options.status) query.status = options.status;
    
    return await Ticket.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 25)
      .skip(options.skip || 0);
  }

  async searchTickets(guildId, query = {}, options = {}) {
    const { page = 1, limit = 25, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const tickets = await Ticket.find({ guildId, ...query })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments({ guildId, ...query });

    return {
      tickets,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasMore: skip + tickets.length < total
      }
    };
  }
}

module.exports = TicketService;
