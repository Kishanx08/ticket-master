const { EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const Ticket = require('../models/Ticket');
const TicketConfig = require('../models/TicketConfig');

/**
 * Get the default ticket embed
 * @param {Object} ticket - The ticket object
 * @param {Object} config - The guild's ticket configuration
 * @returns {EmbedBuilder} - The formatted embed
 */
function getDefaultTicketEmbed(ticket, config) {
  const statusEmojis = {
    open: '🟢',
    in_progress: '🟠',
    awaiting_client: '🟡',
    resolved: '✅',
    closed: '🔒',
    on_hold: '⏸️'
  };

  const priorityEmojis = {
    low: '⬇️',
    medium: '➡️',
    high: '⬆️',
    urgent: '🚨'
  };

  const category = config?.categories?.find(cat => cat.id === ticket.category) || {};
  
  const embed = new EmbedBuilder()
    .setColor(getStatusColor(ticket.status))
    .setTitle(`Ticket #${ticket.ticketId}: ${ticket.title}`)
    .setDescription(ticket.description || 'No description provided.')
    .addFields(
      { 
        name: 'Status', 
        value: `${statusEmojis[ticket.status] || '❓'} ${formatStatus(ticket.status)}`, 
        inline: true 
      },
      { 
        name: 'Priority', 
        value: priorityEmojis[ticket.priority] || ticket.priority, 
        inline: true 
      },
      { 
        name: 'Category', 
        value: category.name || ticket.category || 'General', 
        inline: true 
      },
      { 
        name: 'Created By', 
        value: `<@${ticket.creator.id}>`, 
        inline: true 
      },
      { 
        name: 'Created At', 
        value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:f>`, 
        inline: true 
      }
    )
    .setFooter({ text: `Ticket ID: ${ticket.ticketId}` })
    .setTimestamp();

  if (ticket.claimedBy) {
    embed.addFields({
      name: 'Claimed By',
      value: `<@${ticket.claimedBy.id}>`,
      inline: true
    });
  }

  if (ticket.closedAt) {
    embed.addFields({
      name: 'Closed At',
      value: `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:f>`,
      inline: true
    });

    if (ticket.closeReason) {
      embed.addFields({
        name: 'Close Reason',
        value: ticket.closeReason,
        inline: false
      });
    }
  }

  return embed;
}

/**
 * Get the default ticket action buttons
 * @param {string} ticketId - The ticket ID
 * @param {boolean} isStaff - Whether the user is staff
 * @param {boolean} isClosed - Whether the ticket is closed
 * @returns {ActionRowBuilder} - The action row with buttons
 */
function getTicketActionButtons(ticketId, isStaff = false, isClosed = false) {
  const row = new ActionRowBuilder();
  
  if (isClosed) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_reopen_${ticketId}`)
        .setLabel('Reopen')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔓')
    );
  } else {
    if (isStaff) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticketId}`)
          .setLabel('Claim')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🙋'),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketId}`)
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );
    } else {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketId}`)
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );
    }
  }
  
  // Add transcript button for everyone
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_transcript_${ticketId}`)
      .setLabel('Transcript')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📄')
  );
  
  return row;
}

/**
 * Check if a member has permission to manage tickets
 * @param {GuildMember} member - The guild member
 * @param {Object} config - The guild's ticket configuration
 * @returns {boolean} - Whether the member has permission
 */
function hasTicketPermission(member, config) {
  // Server administrators always have permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }
  
  // Check if member has any staff roles
  const staffRoles = config?.staffRoles || [];
  if (staffRoles.length > 0 && member.roles.cache.some(role => staffRoles.includes(role.id))) {
    return true;
  }
  
  return false;
}

/**
 * Format a status string for display
 * @param {string} status - The status string
 * @returns {string} - The formatted status
 */
function formatStatus(status) {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get the color for a status
 * @param {string} status - The status
 * @returns {number} - The color as a number
 */
function getStatusColor(status) {
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

/**
 * Get the next available ticket number for a guild
 * @param {string} guildId - The guild ID
 * @returns {Promise<number>} - The next ticket number
 */
async function getNextTicketNumber(guildId) {
  const result = await Ticket.findOne({ guildId })
    .sort({ ticketId: -1 })
    .select('ticketId')
    .lean();
    
  return result ? result.ticketId + 1 : 1;
}

/**
 * Get the ticket configuration for a guild, creating it if it doesn't exist
 * @param {string} guildId - The guild ID
 * @returns {Promise<Object>} - The ticket configuration
 */
async function getOrCreateConfig(guildId) {
  let config = await TicketConfig.findOne({ guildId });
  
  if (!config) {
    config = new TicketConfig({
      guildId,
      ticketCategory: null,
      logChannel: null,
      staffRoles: [],
      categories: [],
      maxTicketsPerUser: 3,
      autoCloseInactiveTickets: false,
      inactiveTicketDays: 7,
      saveTranscripts: true
    });
    
    await config.save();
  }
  
  return config;
}

/**
 * Format a duration in milliseconds to a human-readable string
 * @param {number} ms - The duration in milliseconds
 * @returns {string} - The formatted duration
 */
function formatDuration(ms) {
  if (ms < 0) ms = -ms;
  
  const time = {
    day: Math.floor(ms / 86400000),
    hour: Math.floor(ms / 3600000) % 24,
    minute: Math.floor(ms / 60000) % 60,
    second: Math.floor(ms / 1000) % 60
  };
  
  return Object.entries(time)
    .filter(val => val[1] !== 0)
    .map(([key, val]) => `${val} ${key}${val !== 1 ? 's' : ''}`)
    .join(', ');
}

module.exports = {
  getDefaultTicketEmbed,
  getTicketActionButtons,
  hasTicketPermission,
  formatStatus,
  getStatusColor,
  getNextTicketNumber,
  getOrCreateConfig,
  formatDuration
};
