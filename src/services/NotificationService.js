const { MessageEmbed, WebhookClient } = require('discord.js');
const Ticket = require('../models/Ticket');
const TicketConfig = require('../models/TicketConfig');

class NotificationService {
  constructor(client) {
    this.client = client;
    this.webhooks = new Map();
  }

  async getWebhook(channel) {
    if (this.webhooks.has(channel.id)) {
      return this.webhooks.get(channel.id);
    }

    try {
      const webhooks = await channel.fetchWebhooks();
      let webhook = webhooks.find(w => w.owner?.id === this.client.user.id);

      if (!webhook) {
        webhook = await channel.createWebhook({
          name: 'Ticket System',
          avatar: this.client.user.displayAvatarURL(),
          reason: 'Ticket System Notifications'
        });
      }

      this.webhooks.set(channel.id, webhook);
      return webhook;
    } catch (error) {
      console.error('Failed to get webhook:', error);
      return null;
    }
  }

  async sendToLogChannel(guildId, embed, options = {}) {
    try {
      const config = await TicketConfig.getConfig(guildId);
      if (!config?.logChannel) return null;

      const channel = this.client.channels.cache.get(config.logChannel);
      if (!channel) return null;

      const webhook = await this.getWebhook(channel);
      if (!webhook) return null;

      return await webhook.send({
        username: 'Ticket System',
        avatarURL: this.client.user.displayAvatarURL(),
        embeds: [embed],
        ...options
      });
    } catch (error) {
      console.error('Failed to send to log channel:', error);
      return null;
    }
  }

  async notifyTicketCreated(ticket) {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    const config = await TicketConfig.getConfig(guild.id);
    const category = config.getCategory(ticket.category);
    
    // Notify in ticket channel
    const channel = guild.channels.cache.get(ticket.channelId);
    if (channel) {
      const embed = new MessageEmbed()
        .setColor('#5865F2')
        .setTitle(`Ticket #${ticket.ticketId} - ${ticket.title}`)
        .setDescription(ticket.description || 'No description provided')
        .addFields(
          { name: 'Status', value: '🟢 Open', inline: true },
          { name: 'Priority', value: this.formatPriority(ticket.priority), inline: true },
          { name: 'Category', value: category?.name || ticket.category, inline: true },
          { name: 'Created By', value: `<@${ticket.creator.id}>`, inline: true },
          { name: 'Created At', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
        )
        .setFooter({ text: `Ticket ID: ${ticket.ticketId}` });

      const row = {
        type: 1,
        components: [
          {
            type: 2,
            style: 'DANGER',
            customId: `ticket_close_${ticket.ticketId}`,
            emoji: '🔒',
            label: 'Close Ticket'
          },
          {
            type: 2,
            style: 'PRIMARY',
            customId: `ticket_claim_${ticket.ticketId}`,
            emoji: '🙋',
            label: 'Claim Ticket'
          },
          {
            type: 2,
            style: 'SECONDARY',
            customId: `ticket_transcript_${ticket.ticketId}`,
            emoji: '📄',
            label: 'Transcript'
          }
        ]
      };

      await channel.send({
        content: `Welcome <@${ticket.creator.id}>! A staff member will assist you shortly.`,
        embeds: [embed],
        components: [row]
      });
    }

    // Send to log channel
    const logEmbed = new MessageEmbed()
      .setColor('#57F287')
      .setTitle('Ticket Created')
      .setDescription(`**Ticket #${ticket.ticketId}** has been created`)
      .addFields(
        { name: 'Title', value: ticket.title, inline: true },
        { name: 'Category', value: category?.name || ticket.category, inline: true },
        { name: 'Created By', value: `<@${ticket.creator.id}>`, inline: true },
        { name: 'Channel', value: channel ? `<#${channel.id}>` : 'N/A', inline: true },
        { name: 'Priority', value: this.formatPriority(ticket.priority), inline: true }
      )
      .setTimestamp();

    await this.sendToLogChannel(guild.id, logEmbed);

    // Notify staff if configured
    if (config.notificationChannel) {
      const notifyChannel = guild.channels.cache.get(config.notificationChannel);
      if (notifyChannel) {
        const mentionRoles = category?.staffRoles?.length 
          ? category.staffRoles.map(id => `<@&${id}>`).join(' ')
          : '';

        await notifyChannel.send({
          content: `${mentionRoles} New ticket created by <@${ticket.creator.id}>`,
          embeds: [logEmbed]
        });
      }
    }
  }

  async notifyTicketClosed(ticket, closer) {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    const closerMember = await guild.members.fetch(closer.id).catch(() => null);
    const closerName = closerMember?.displayName || closer.username;

    // Notify in ticket channel
    const channel = guild.channels.cache.get(ticket.channelId);
    if (channel) {
      const embed = new MessageEmbed()
        .setColor('#ED4245')
        .setTitle(`Ticket #${ticket.ticketId} - Closed`)
        .setDescription(`This ticket has been closed by ${closerName}`)
        .addFields(
          { name: 'Opened At', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:f>`, inline: true },
          { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
          { name: 'Duration', value: this.formatDuration(ticket.createdAt, new Date()), inline: true }
        )
        .setFooter({ text: `Ticket ID: ${ticket.ticketId}` });

      await channel.send({ embeds: [embed] });
    }

    // Send to log channel
    const logEmbed = new MessageEmbed()
      .setColor('#ED4245')
      .setTitle('Ticket Closed')
      .setDescription(`**Ticket #${ticket.ticketId}** has been closed`)
      .addFields(
        { name: 'Title', value: ticket.title, inline: true },
        { name: 'Category', value: ticket.category, inline: true },
        { name: 'Created By', value: `<@${ticket.creator.id}>`, inline: true },
        { name: 'Closed By', value: `<@${closer.id}>`, inline: true },
        { name: 'Duration', value: this.formatDuration(ticket.createdAt, new Date()), inline: true }
      )
      .setTimestamp();

    await this.sendToLogChannel(guild.id, logEmbed);
  }

  async notifyTicketReopened(ticket, user) {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    // Notify in ticket channel
    const channel = guild.channels.cache.get(ticket.channelId);
    if (channel) {
      const embed = new MessageEmbed()
        .setColor('#57F287')
        .setTitle(`Ticket #${ticket.ticketId} - Reopened`)
        .setDescription(`This ticket has been reopened by <@${user.id}>`)
        .setFooter({ text: `Ticket ID: ${ticket.ticketId}` });

      await channel.send({ embeds: [embed] });
    }

    // Send to log channel
    const logEmbed = new MessageEmbed()
      .setColor('#57F287')
      .setTitle('Ticket Reopened')
      .setDescription(`**Ticket #${ticket.ticketId}** has been reopened`)
      .addFields(
        { name: 'Title', value: ticket.title, inline: true },
        { name: 'Category', value: ticket.category, inline: true },
        { name: 'Reopened By', value: `<@${user.id}>`, inline: true }
      )
      .setTimestamp();

    await this.sendToLogChannel(guild.id, logEmbed);
  }

  async notifyTicketClaimed(ticket, claimer) {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    // Notify in ticket channel
    const channel = guild.channels.cache.get(ticket.channelId);
    if (channel) {
      const embed = new MessageEmbed()
        .setColor('#FEE75C')
        .setDescription(`🎫 This ticket has been claimed by <@${claimer.id}>`);

      await channel.send({ embeds: [embed] });
    }

    // Send to log channel
    const logEmbed = new MessageEmbed()
      .setColor('#FEE75C')
      .setTitle('Ticket Claimed')
      .setDescription(`**Ticket #${ticket.ticketId}** has been claimed`)
      .addFields(
        { name: 'Title', value: ticket.title, inline: true },
        { name: 'Claimed By', value: `<@${claimer.id}>`, inline: true },
        { name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await this.sendToLogChannel(guild.id, logEmbed);
  }

  async notifyTicketStatusChanged(ticket, oldStatus, newStatus, updater) {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    const statusEmojis = {
      open: '🟢',
      in_progress: '🟠',
      awaiting_client: '🟡',
      resolved: '✅',
      closed: '🔒',
      on_hold: '⏸️'
    };

    const statusNames = {
      open: 'Open',
      in_progress: 'In Progress',
      awaiting_client: 'Awaiting Client',
      resolved: 'Resolved',
      closed: 'Closed',
      on_hold: 'On Hold'
    };

    // Notify in ticket channel
    const channel = guild.channels.cache.get(ticket.channelId);
    if (channel) {
      const embed = new MessageEmbed()
        .setColor(this.getStatusColor(newStatus))
        .setDescription(`**Status Updated**\n${statusEmojis[oldStatus] || '❓'} → ${statusEmojis[newStatus] || '❓'} ${statusNames[newStatus] || newStatus}\n\nUpdated by <@${updater.id}>`)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }

    // Send to log channel
    const logEmbed = new MessageEmbed()
      .setColor(this.getStatusColor(newStatus))
      .setTitle('Ticket Status Updated')
      .setDescription(`**Ticket #${ticket.ticketId}** status has been updated`)
      .addFields(
        { name: 'Title', value: ticket.title, inline: true },
        { name: 'Old Status', value: statusNames[oldStatus] || oldStatus, inline: true },
        { name: 'New Status', value: statusNames[newStatus] || newStatus, inline: true },
        { name: 'Updated By', value: `<@${updater.id}>`, inline: true }
      )
      .setTimestamp();

    await this.sendToLogChannel(guild.id, logEmbed);
  }

  // Utility Methods
  formatPriority(priority) {
    const priorities = {
      low: '⬇️ Low',
      medium: '➡️ Medium',
      high: '⬆️ High',
      urgent: '🚨 Urgent'
    };
    return priorities[priority] || priority;
  }

  formatDuration(start, end) {
    const duration = end - start;
    const seconds = Math.floor(duration / 1000) % 60;
    const minutes = Math.floor(duration / (1000 * 60)) % 60;
    const hours = Math.floor(duration / (1000 * 60 * 60)) % 24;
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  }

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
}

module.exports = NotificationService;
