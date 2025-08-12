const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const TicketService = require('../services/TicketService');
const DiscordService = require('../services/DiscordService');
const NotificationService = require('../services/NotificationService');
const TranscriptService = require('../services/TranscriptService');
const TicketConfig = require('../models/TicketConfig');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle button interactions
    if (interaction.isButton()) {
      const [action, ticketId] = interaction.customId.split('_');
      
      switch (action) {
        case 'create':
          await handleCreateTicketButton(interaction, client);
          break;
        case 'close':
          await handleCloseTicketButton(interaction, client);
          break;
        case 'claim':
          await handleClaimTicketButton(interaction, client);
          break;
        case 'transcript':
          await handleTranscriptButton(interaction, client);
          break;
        case 'reopen':
          await handleReopenTicketButton(interaction, client);
          break;
        default:
          // Handle other button interactions if needed
          break;
      }
    }
    
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_create_')) {
        await handleCreateTicketModal(interaction, client);
      }
    }
  }
};

async function handleCreateTicketButton(interaction, client) {
  // Check if the ticket system is set up
  const config = await TicketConfig.getConfig(interaction.guildId);
  if (!config) {
    return interaction.reply({
      content: 'The ticket system has not been set up yet.',
      ephemeral: true
    });
  }
  
  // Create a modal for ticket creation
  const modal = new ModalBuilder()
    .setCustomId('ticket_create_modal')
    .setTitle('Create a Ticket');
  
  // Add components to modal
  const subjectInput = new TextInputBuilder()
    .setCustomId('ticket_subject')
    .setLabel('Subject')
    .setPlaceholder('Briefly describe your issue')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);
    
  const descriptionInput = new TextInputBuilder()
    .setCustomId('ticket_description')
    .setLabel('Description')
    .setPlaceholder('Please provide as much detail as possible')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
    
  const firstActionRow = new ActionRowBuilder().addComponents(subjectInput);
  const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
  
  modal.addComponents(firstActionRow, secondActionRow);
  
  // Show the modal to the user
  await interaction.showModal(modal);
}

async function handleCreateTicketModal(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  
  const subject = interaction.fields.getTextInputValue('ticket_subject');
  const description = interaction.fields.getTextInputValue('ticket_description');
  
  const ticketService = new TicketService(client);
  const discordService = new DiscordService(client);
  const notificationService = new NotificationService(client);
  
  try {
    // Get the ticket configuration
    const config = await TicketConfig.getConfig(interaction.guildId);
    if (!config) {
      return interaction.editReply({
        content: 'The ticket system has not been set up yet.',
        ephemeral: true
      });
    }
    
    // Check if user has reached the ticket limit
    const userTickets = await ticketService.getUserTickets(interaction.user.id, interaction.guildId);
    const maxTickets = config.maxTicketsPerUser || 3;
    
    if (userTickets.length >= maxTickets) {
      return interaction.editReply({
        content: `You have reached the maximum number of tickets (${maxTickets}). Please close some of your existing tickets before creating a new one.`,
        ephemeral: true
      });
    }
    
    // Create the ticket
    const ticketData = {
      guildId: interaction.guildId,
      creator: {
        id: interaction.user.id,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator
      },
      category: 'general', // Default category
      title: subject,
      description: description,
      priority: 'medium',
      status: 'open'
    };
    
    const ticket = await ticketService.createTicket(ticketData);
    
    // Create the ticket channel
    const channel = await discordService.createTicketChannel(
      interaction.guild,
      `ticket-${ticket.ticketId}`,
      config.ticketCategory,
      interaction.user,
      config.staffRoles
    );
    
    // Update the ticket with the channel ID
    await ticketService.updateTicket(ticket._id, { channelId: channel.id });
    
    // Send notification
    await notificationService.notifyTicketCreated({
      ...ticket.toObject(),
      channelId: channel.id
    });
    
    await interaction.editReply({
      content: `Your ticket has been created: ${channel}`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error creating ticket from modal:', error);
    await interaction.editReply({
      content: 'An error occurred while creating your ticket. Please try again later.',
      ephemeral: true
    });
  }
}

async function handleCloseTicketButton(interaction, client) {
  const ticketService = new TicketService(client);
  const notificationService = new NotificationService(client);
  
  try {
    // Find the ticket for this channel
    const ticket = await ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({
        content: 'This is not a valid ticket channel.',
        ephemeral: true
      });
    }
    
    // Check permissions
    const hasPermission = interaction.member.roles.cache.some(role => 
      role.permissions.has('ManageMessages') || 
      ticket.creator.id === interaction.user.id
    );
    
    if (!hasPermission) {
      return interaction.reply({
        content: 'You do not have permission to close this ticket.',
        ephemeral: true
      });
    }
    
    // Create a confirmation button
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_close_${ticket.ticketId}`)
          .setLabel('Confirm Close')
          .setStyle('Danger')
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('cancel_close')
          .setLabel('Cancel')
          .setStyle('Secondary')
      );
    
    await interaction.reply({
      content: 'Are you sure you want to close this ticket?',
      components: [row],
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error handling close ticket button:', error);
    await interaction.reply({
      content: 'An error occurred while processing your request.',
      ephemeral: true
    });
  }
}

async function handleClaimTicketButton(interaction, client) {
  const ticketService = new TicketService(client);
  const notificationService = new NotificationService(client);
  
  try {
    // Find the ticket for this channel
    const ticket = await ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({
        content: 'This is not a valid ticket channel.',
        ephemeral: true
      });
    }
    
    // Check if ticket is already claimed
    if (ticket.claimedBy) {
      return interaction.reply({
        content: `This ticket is already claimed by <@${ticket.claimedBy.id}>.`,
        ephemeral: true
      });
    }
    
    // Claim the ticket
    await ticketService.claimTicket(
      ticket._id,
      {
        id: interaction.user.id,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator
      }
    );
    
    // Send notification
    await notificationService.notifyTicketClaimed(
      ticket,
      {
        id: interaction.user.id,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator
      }
    );
    
    await interaction.reply({
      content: `${interaction.user} has claimed this ticket!`,
      allowedMentions: { users: [] }
    });
    
  } catch (error) {
    console.error('Error claiming ticket:', error);
    await interaction.reply({
      content: 'An error occurred while claiming the ticket.',
      ephemeral: true
    });
  }
}

async function handleTranscriptButton(interaction, client) {
  const ticketService = new TicketService(client);
  const transcriptService = new TranscriptService(client);
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Find the ticket for this channel
    const ticket = await ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.editReply({
        content: 'This is not a valid ticket channel.',
        ephemeral: true
      });
    }
    
    // Get all messages for this ticket
    const messages = await ticketService.getTicketMessages(ticket._id);
    
    // Generate transcript
    const { file } = await transcriptService.generateTranscript(ticket, messages);
    
    // Send the transcript
    await interaction.editReply({
      content: 'Here is the transcript for this ticket:',
      files: [file],
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error generating transcript:', error);
    await interaction.editReply({
      content: 'An error occurred while generating the transcript.',
      ephemeral: true
    });
  }
}

async function handleReopenTicketButton(interaction, client) {
  const ticketService = new TicketService(client);
  const notificationService = new NotificationService(client);
  
  try {
    // Find the ticket for this channel
    const ticket = await ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({
        content: 'This is not a valid ticket channel.',
        ephemeral: true
      });
    }
    
    // Check if the ticket is actually closed
    if (ticket.status !== 'closed') {
      return interaction.reply({
        content: 'This ticket is not closed.',
        ephemeral: true
      });
    }
    
    // Check permissions
    const hasPermission = interaction.member.roles.cache.some(role => 
      role.permissions.has('ManageMessages') || 
      ticket.creator.id === interaction.user.id
    );
    
    if (!hasPermission) {
      return interaction.reply({
        content: 'You do not have permission to reopen this ticket.',
        ephemeral: true
      });
    }
    
    // Reopen the ticket
    await ticketService.updateTicket(ticket._id, { 
      status: 'open',
      closedAt: null,
      closedBy: null,
      closeReason: null
    });
    
    // Send notification
    await notificationService.notifyTicketReopened(
      ticket,
      {
        id: interaction.user.id,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator
      }
    );
    
    await interaction.reply({
      content: `${interaction.user} has reopened this ticket!`,
      allowedMentions: { users: [] }
    });
    
  } catch (error) {
    console.error('Error reopening ticket:', error);
    await interaction.reply({
      content: 'An error occurred while reopening the ticket.',
      ephemeral: true
    });
  }
}
