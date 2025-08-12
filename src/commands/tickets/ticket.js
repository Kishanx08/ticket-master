const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TicketService = require('../../services/TicketService');
const DiscordService = require('../../services/DiscordService');
const NotificationService = require('../../services/NotificationService');
const TicketConfig = require('../../models/TicketConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up the ticket system')
        .addChannelOption(option =>
          option.setName('category')
            .setDescription('Category where ticket channels will be created')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('log-channel')
            .setDescription('Channel where ticket logs will be sent')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('staff-role')
            .setDescription('Role that can view and manage tickets')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new ticket')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Category for the ticket')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option.setName('subject')
            .setDescription('Brief description of your issue')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('priority')
            .setDescription('Priority level')
            .addChoices(
              { name: 'Low', value: 'low' },
              { name: 'Medium', value: 'medium' },
              { name: 'High', value: 'high' },
              { name: 'Urgent', value: 'urgent' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for closing the ticket')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the ticket')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to add to the ticket')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from the ticket')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove from the ticket')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('Claim the current ticket')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const ticketService = new TicketService(client);
    const discordService = new DiscordService(client);
    const notificationService = new NotificationService(client);

    try {
      switch (subcommand) {
        case 'setup':
          await handleSetup(interaction, client);
          break;
        case 'create':
          await handleCreate(interaction, client, ticketService, discordService, notificationService);
          break;
        case 'close':
          await handleClose(interaction, client, ticketService, notificationService);
          break;
        case 'add':
          await handleAdd(interaction, client, ticketService, notificationService);
          break;
        case 'remove':
          await handleRemove(interaction, client, ticketService, notificationService);
          break;
        case 'claim':
          await handleClaim(interaction, client, ticketService, notificationService);
          break;
        default:
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (error) {
      console.error('Error in ticket command:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing your request.', 
        ephemeral: true 
      });
    }
  },

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const config = await TicketConfig.getConfig(interaction.guildId);
    
    if (!config || !config.categories) {
      await interaction.respond([]);
      return;
    }

    const filtered = config.categories
      .filter(category => 
        category.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
        category.id.toLowerCase().includes(focusedValue.toLowerCase())
      )
      .slice(0, 25)
      .map(category => ({
        name: category.name,
        value: category.id
      }));

    await interaction.respond(filtered);
  }
};

async function handleSetup(interaction, client) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ 
      content: 'You need administrator permissions to set up the ticket system.', 
      ephemeral: true 
    });
  }

  const category = interaction.options.getChannel('category');
  const logChannel = interaction.options.getChannel('log-channel');
  const staffRole = interaction.options.getRole('staff-role');

  if (category.type !== 4) { // GUILD_CATEGORY
    return interaction.reply({ 
      content: 'Please select a valid category.', 
      ephemeral: true 
    });
  }

  if (logChannel.type !== 0) { // GUILD_TEXT
    return interaction.reply({ 
      content: 'Please select a valid text channel for logs.', 
      ephemeral: true 
    });
  }

  try {
    // Create or update the ticket configuration
    await TicketConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      {
        guildId: interaction.guildId,
        ticketCategory: category.id,
        logChannel: logChannel.id,
        staffRoles: [staffRole.id],
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Create the ticket panel message
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Create a Ticket')
      .setDescription('Click the button below to create a new ticket. Our staff will assist you shortly.')
      .addFields(
        { name: 'Categories', value: '• General Support\n• Billing\n• Technical Issues\n• Other' },
        { name: 'Response Time', value: 'We typically respond within 24 hours.', inline: true },
        { name: 'Working Hours', value: 'Monday - Friday, 9 AM - 5 PM (UTC)', inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} Support` });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('Create Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

    await interaction.reply({ 
      content: 'Ticket system has been set up successfully!', 
      embeds: [embed], 
      components: [row],
      ephemeral: true 
    });
  } catch (error) {
    console.error('Error setting up ticket system:', error);
    await interaction.reply({ 
      content: 'An error occurred while setting up the ticket system.', 
      ephemeral: true 
    });
  }
}

async function handleCreate(interaction, client, ticketService, discordService, notificationService) {
  await interaction.deferReply({ ephemeral: true });
  
  const categoryId = interaction.options.getString('category');
  const subject = interaction.options.getString('subject');
  const priority = interaction.options.getString('priority') || 'medium';
  
  try {
    // Get the ticket configuration
    const config = await TicketConfig.getConfig(interaction.guildId);
    if (!config) {
      return interaction.editReply({ 
        content: 'The ticket system has not been set up yet. Please contact an administrator.',
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
      category: categoryId,
      title: subject,
      description: 'No additional details provided.',
      priority: priority,
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
    console.error('Error creating ticket:', error);
    await interaction.editReply({
      content: 'An error occurred while creating your ticket. Please try again later.',
      ephemeral: true
    });
  }
}

async function handleClose(interaction, client, ticketService, notificationService) {
  await interaction.deferReply({ ephemeral: true });
  
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  try {
    // Find the ticket for this channel
    const ticket = await ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.editReply({
        content: 'This is not a valid ticket channel.',
        ephemeral: true
      });
    }
    
    // Check permissions
    const hasPermission = interaction.member.roles.cache.some(role => 
      role.permissions.has(PermissionFlagsBits.ManageMessages) || 
      ticket.creator.id === interaction.user.id
    );
    
    if (!hasPermission) {
      return interaction.editReply({
        content: 'You do not have permission to close this ticket.',
        ephemeral: true
      });
    }
    
    // Close the ticket
    const closedTicket = await ticketService.closeTicket(
      ticket._id,
      interaction.user.id,
      reason
    );
    
    // Send notification
    await notificationService.notifyTicketClosed(
      ticket,
      {
        id: interaction.user.id,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator
      },
      reason
    );
    
    // Delete the channel after a delay
    setTimeout(async () => {
      try {
        const channel = interaction.guild.channels.cache.get(ticket.channelId);
        if (channel) {
          await channel.delete('Ticket closed');
        }
      } catch (error) {
        console.error('Error deleting ticket channel:', error);
      }
    }, 10000); // 10 second delay
    
    await interaction.editReply({
      content: 'This ticket has been closed and will be deleted shortly.',
      ephemeral: false
    });
    
  } catch (error) {
    console.error('Error closing ticket:', error);
    await interaction.editReply({
      content: 'An error occurred while closing the ticket.',
      ephemeral: true
    });
  }
}

async function handleAdd(interaction, client, ticketService, notificationService) {
  await interaction.deferReply({ ephemeral: true });
  
  const user = interaction.options.getUser('user');
  
  try {
    // Find the ticket for this channel
    const ticket = await ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.editReply({
        content: 'This is not a valid ticket channel.',
        ephemeral: true
      });
    }
    
    // Check if user is already added
    if (ticket.participants.some(p => p.id === user.id)) {
      return interaction.editReply({
        content: 'This user is already part of the ticket.',
        ephemeral: true
      });
    }
    
    // Add the user to the ticket
    await ticketService.addParticipant(ticket._id, {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator
    });
    
    // Update channel permissions
    const channel = interaction.guild.channels.cache.get(ticket.channelId);
    if (channel) {
      await channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
    }
    
    await interaction.editReply({
      content: `Added ${user} to the ticket.`,
      ephemeral: false
    });
    
  } catch (error) {
    console.error('Error adding user to ticket:', error);
    await interaction.editReply({
      content: 'An error occurred while adding the user to the ticket.',
      ephemeral: true
    });
  }
}

async function handleRemove(interaction, client, ticketService, notificationService) {
  await interaction.deferReply({ ephemeral: true });
  
  const user = interaction.options.getUser('user');
  
  try {
    // Find the ticket for this channel
    const ticket = await ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.editReply({
        content: 'This is not a valid ticket channel.',
        ephemeral: true
      });
    }
    
    // Check if user is the ticket creator
    if (ticket.creator.id === user.id) {
      return interaction.editReply({
        content: 'You cannot remove the ticket creator from the ticket.',
        ephemeral: true
      });
    }
    
    // Remove the user from the ticket
    await ticketService.removeParticipant(ticket._id, user.id);
    
    // Update channel permissions
    const channel = interaction.guild.channels.cache.get(ticket.channelId);
    if (channel) {
      await channel.permissionOverwrites.delete(user.id);
    }
    
    await interaction.editReply({
      content: `Removed ${user} from the ticket.`,
      ephemeral: false
    });
    
  } catch (error) {
    console.error('Error removing user from ticket:', error);
    await interaction.editReply({
      content: 'An error occurred while removing the user from the ticket.',
      ephemeral: true
    });
  }
}

async function handleClaim(interaction, client, ticketService, notificationService) {
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
    
    // Check if ticket is already claimed
    if (ticket.claimedBy) {
      return interaction.editReply({
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
    
    await interaction.editReply({
      content: 'You have claimed this ticket!',
      ephemeral: false
    });
    
  } catch (error) {
    console.error('Error claiming ticket:', error);
    await interaction.editReply({
      content: 'An error occurred while claiming the ticket.',
      ephemeral: true
    });
  }
}
