const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const Ticket = require('../models/Ticket');
const TicketConfig = require('../models/TicketConfig');

class DiscordService {
  constructor(client) {
    this.client = client;
  }

  // Channel Management
  async createTicketChannel(ticket, categoryConfig) {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) throw new Error('Guild not found');

    // Format channel name
    let channelName = categoryConfig.channelName || 'ticket-{number}';
    channelName = channelName
      .replace('{number}', ticket.ticketId.split('-').pop())
      .replace('{user}', ticket.creator.username.replace(/[^a-z0-9]/gi, '-').toLowerCase())
      .substring(0, 100);

    // Set up permissions
    const permissionOverwrites = [
      // Deny view for @everyone
      {
        id: guild.roles.everyone.id,
        deny: ['VIEW_CHANNEL']
      },
      // Allow view for ticket creator
      {
        id: ticket.creator.id,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
      }
    ];

    // Add staff roles
    if (categoryConfig.staffRoles?.length > 0) {
      for (const roleId of categoryConfig.staffRoles) {
        permissionOverwrites.push({
          id: roleId,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'MANAGE_MESSAGES']
        });
      }
    }

    // Create the channel
    const channel = await guild.channels.create(channelName, {
      type: 'GUILD_TEXT',
      parent: categoryConfig.parentId,
      topic: `Ticket #${ticket.ticketId} - ${ticket.title}`,
      permissionOverwrites
    });

    return channel;
  }

  async updateChannelPermissions(channel, updates) {
    if (!channel) return;
    
    try {
      if (updates.allow) {
        for (const [id, permissions] of Object.entries(updates.allow)) {
          await channel.permissionOverwrites.edit(id, permissions);
        }
      }
      
      if (updates.deny) {
        for (const [id, permissions] of Object.entries(updates.deny)) {
          await channel.permissionOverwrites.edit(id, permissions);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update channel permissions:', error);
      return false;
    }
  }

  // Embeds and Messages
  getTicketEmbed(ticket, action = 'created') {
    const statusEmoji = {
      open: '🟢',
      in_progress: '🟠',
      awaiting_client: '🟡',
      resolved: '✅',
      closed: '🔒',
      on_hold: '⏸️'
    };

    const priorityEmoji = {
      low: '⬇️',
      medium: '➡️',
      high: '⬆️',
      urgent: '🚨'
    };

    const embed = new MessageEmbed()
      .setColor(this.getStatusColor(ticket.status))
      .setTitle(`Ticket #${ticket.ticketId} - ${ticket.title}`)
      .setDescription(ticket.description || 'No description provided')
      .addFields(
        { name: 'Status', value: `${statusEmoji[ticket.status] || '❓'} ${this.formatStatus(ticket.status)}`, inline: true },
        { name: 'Priority', value: `${priorityEmoji[ticket.priority] || '❓'} ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}`, inline: true },
        { name: 'Category', value: ticket.category || 'General', inline: true },
        { name: 'Created By', value: `<@${ticket.creator.id}>`, inline: true },
        { name: 'Created At', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:f>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${ticket.ticketId}` });

    if (ticket.closedAt) {
      embed.addField('Closed At', `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:f>`, true);
      if (ticket.closedBy) {
        embed.addField('Closed By', `<@${ticket.closedBy}>`, true);
      }
    }

    // Add custom fields if any
    if (ticket.customFields && Object.keys(ticket.customFields).length > 0) {
      const fields = [];
      for (const [key, value] of Object.entries(ticket.customFields)) {
        if (value) {
          fields.push(`**${key}:** ${value}`);
        }
      }
      if (fields.length > 0) {
        embed.addField('Additional Information', fields.join('\n'));
      }
    }

    // Add participants if any
    if (ticket.assignedTo?.length > 0) {
      const participants = ticket.assignedTo.map(p => `<@${p.id}>`).join(', ');
      embed.addField('Participants', participants);
    }

    return embed;
  }

  getTicketControls(ticket) {
    const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId(`ticket_close_${ticket.ticketId}`)
          .setLabel('Close')
          .setStyle('DANGER')
          .setEmoji('🔒'),
        new MessageButton()
          .setCustomId(`ticket_claim_${ticket.ticketId}`)
          .setLabel('Claim')
          .setStyle('PRIMARY')
          .setEmoji('🙋'),
        new MessageButton()
          .setCustomId(`ticket_transcript_${ticket.ticketId}`)
          .setLabel('Transcript')
          .setStyle('SECONDARY')
          .setEmoji('📄')
      );

    // Add more buttons based on status
    if (ticket.status === 'closed') {
      row.components[0]
        .setLabel('Reopen')
        .setStyle('SUCCESS')
        .setEmoji('🔓');
    }

    return row;
  }

  // Utility Methods
  getStatusColor(status) {
    const colors = {
      open: 0x57F287, // Green
      in_progress: 0xFEE75C, // Yellow
      awaiting_client: 0xEB459E, // Pink
      resolved: 0x57F287, // Green
      closed: 0xED4245, // Red
      on_hold: 0x5865F2 // Blurple
    };

    return colors[status] || 0x5865F2; // Default to blurple
  }

  formatStatus(status) {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Notification Methods
  async notifyTicketCreated(ticket, channel) {
    const embed = this.getTicketEmbed(ticket, 'created');
    const controls = this.getTicketControls(ticket);
    
    const message = await channel.send({
      content: `Ticket created by <@${ticket.creator.id}>`,
      embeds: [embed],
      components: [controls]
    });

    try {
      await message.pin();
    } catch (error) {
      console.error('Failed to pin ticket message:', error);
    }

    return message;
  }

  async notifyTicketUpdated(ticket, updater, changes) {
    const channel = this.client.channels.cache.get(ticket.channelId);
    if (!channel) return;

    const embed = new MessageEmbed()
      .setColor(0x5865F2)
      .setTitle(`Ticket Updated`)
      .setDescription(`<@${updater.id}> updated this ticket`)
      .setTimestamp();

    if (changes.status) {
      embed.addField('Status Changed', 
        `\`${this.formatStatus(changes.oldStatus)}\` → \`${this.formatStatus(changes.newStatus)}\``
      );
    }

    if (changes.assignee) {
      const action = changes.added ? 'Added' : 'Removed';
      embed.addField('Participant ' + action, `<@${changes.userId}>`);
    }

    return channel.send({ embeds: [embed] });
  }

  async notifyTicketClosed(ticket, closer, reason) {
    const channel = this.client.channels.cache.get(ticket.channelId);
    if (!channel) return;

    const embed = new MessageEmbed()
      .setColor(0xED4245)
      .setTitle('Ticket Closed')
      .setDescription(`This ticket has been closed by <@${closer.id}>`)
      .addField('Reason', reason || 'No reason provided')
      .setTimestamp();

    return channel.send({ embeds: [embed] });
  }
}

module.exports = DiscordService;
