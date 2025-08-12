const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const ticketManager = require('../utils/ticketManager');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup the ticket system')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send the ticket creation message')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add to the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove from the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Change ticket status')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('New status for the ticket')
                        .setRequired(true)
                        .addChoices(
                            { name: '📝 Open', value: 'open' },
                            { name: '🚀 In Progress', value: 'in_progress' },
                            { name: '⏳ Awaiting Client', value: 'awaiting_client' },
                            { name: '🧪 Testing', value: 'testing' },
                            { name: '✅ Completed', value: 'completed' },
                            { name: '⏸️ On Hold', value: 'on_hold' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('transcript')
                .setDescription('Generate a transcript of the current ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the details of the current ticket')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            await this.handleSetup(interaction);
        } else if (subcommand === 'close') {
            await this.handleClose(interaction);
        } else if (subcommand === 'add') {
            await this.handleAdd(interaction);
        } else if (subcommand === 'remove') {
            await this.handleRemove(interaction);
        } else if (subcommand === 'status') {
            await this.handleStatus(interaction);
        } else if (subcommand === 'transcript') {
            await this.handleTranscript(interaction);
        } else if (subcommand === 'view') {
            await this.handleView(interaction);
        }
    },

    async handleSetup(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need administrator permissions to setup the ticket system.',
                flags: 64
            });
        }

        const channel = interaction.options.getChannel('channel');
        const setupConfig = config.setupEmbed;

        const embed = new EmbedBuilder()
            .setTitle(setupConfig.title)
            .setDescription(setupConfig.description)
            .setColor(parseInt(setupConfig.color, 16));

        // Add fields from config
        if (setupConfig.fields && setupConfig.fields.length > 0) {
            setupConfig.fields.forEach(field => {
                embed.addFields({ 
                    name: field.name, 
                    value: field.value, 
                    inline: field.inline 
                });
            });
        }

        // Set footer
        if (setupConfig.footer && setupConfig.footer.text) {
            const footerOptions = { text: setupConfig.footer.text };
            if (setupConfig.footer.iconUrl) {
                footerOptions.iconURL = setupConfig.footer.iconUrl;
            }
            embed.setFooter(footerOptions);
        }

        // Set thumbnail and image if configured
        if (setupConfig.thumbnail) embed.setThumbnail(setupConfig.thumbnail);
        if (setupConfig.image) embed.setImage(setupConfig.image);

        embed.setTimestamp();

        // Create buttons for each ticket type
        const buttons = [];
        Object.entries(config.ticketTypes).forEach(([key, ticketType]) => {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`create_ticket_${key}`)
                    .setLabel(ticketType.label)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(ticketType.emoji)
            );
        });

        const rows = [];
        // Split buttons into rows (max 5 per row)
        for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            rows.push(row);
        }

        try {
            await channel.send({
                embeds: [embed],
                components: rows
            });

            await interaction.reply({
                content: `✅ Ticket system has been setup in ${channel}`,
                flags: 64
            });
        } catch (error) {
            console.error('Error setting up ticket system:', error);
            await interaction.reply({
                content: '❌ Failed to setup ticket system. Please check bot permissions.',
                flags: 64
            });
        }
    },

    async handleClose(interaction) {
        const ticket = await ticketManager.getTicketByChannel(interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This is not a ticket channel.',
                flags: 64
            });
        }

        // Check if user is the ticket owner or has manage channels permission
        if (ticket.userId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ You can only close your own tickets or need Manage Channels permission.',
                flags: 64
            });
        }

        await interaction.deferReply();

        try {
            // Generate transcript before closing if enabled
            if (config.defaultSettings.generateTranscripts) {
                const transcriptManager = require('../utils/transcriptManager');
                const transcript = await transcriptManager.generateTranscript(interaction.channel, ticket);
                
                // Send transcript to user via DM
                try {
                    const user = await interaction.client.users.fetch(ticket.userId);
                    await user.send({
                        content: `📄 Here's the transcript of your ticket #${ticket.ticketNumber}:`,
                        files: [transcript]
                    });
                } catch (error) {
                    console.log('Could not send transcript to user via DM');
                }
            }

            await ticketManager.closeTicket(ticket._id, interaction.user.id);

            const embed = new EmbedBuilder()
                .setTitle('🔒 Ticket Closed')
                .setDescription(`This ticket has been closed by ${interaction.user}.\n\n${config.defaultSettings.generateTranscripts ? '📄 Transcript has been generated and sent to the client.' : ''}\n\nChannel will be deleted in 10 seconds.`)
                .setColor(0xFF0000)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Delete channel after 10 seconds
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error('Error deleting ticket channel:', error);
                }
            }, 10000);
        } catch (error) {
            console.error('Error closing ticket:', error);
            await interaction.editReply({
                content: '❌ Failed to close ticket properly. Please try again.'
            });
        }
    },

    async handleAdd(interaction) {
        const ticket = await ticketManager.getTicketByChannel(interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This is not a ticket channel.',
                flags: 64
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ You need Manage Channels permission to add users to tickets.',
                flags: 64
            });
        }

        const user = interaction.options.getUser('user');

        try {
            await interaction.channel.permissionOverwrites.edit(user, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await interaction.reply({
                content: `✅ Added ${user} to the ticket.`,
                flags: 64
            });
        } catch (error) {
            console.error('Error adding user to ticket:', error);
            await interaction.reply({
                content: '❌ Failed to add user to ticket.',
                flags: 64
            });
        }
    },

    async handleRemove(interaction) {
        const ticket = await ticketManager.getTicketByChannel(interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This is not a ticket channel.',
                flags: 64
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ You need Manage Channels permission to remove users from tickets.',
                flags: 64
            });
        }

        const user = interaction.options.getUser('user');

        try {
            await interaction.channel.permissionOverwrites.delete(user);

            await interaction.reply({
                content: `✅ Removed ${user} from the ticket.`,
                flags: 64
            });
        } catch (error) {
            console.error('Error removing user from ticket:', error);
            await interaction.reply({
                content: '❌ Failed to remove user from ticket.',
                flags: 64
            });
        }
    },

    async handleStatus(interaction) {
        const ticket = await ticketManager.getTicketByChannel(interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This is not a ticket channel.',
                flags: 64
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ You need Manage Channels permission to change ticket status.',
                flags: 64
            });
        }

        const newStatus = interaction.options.getString('status');
        const oldStatus = ticket.status;

        // Update ticket status
        await ticketManager.updateTicketStatus(ticket._id, newStatus);

        // Send status update message
        const statusConfig = config.statusMessages[newStatus];
        if (statusConfig) {
            const statusEmbed = new EmbedBuilder()
                .setDescription(statusConfig.message)
                .setColor(parseInt(statusConfig.color, 16))
                .setTimestamp();

            await interaction.channel.send({ embeds: [statusEmbed] });
        }

        await interaction.reply({
            content: `✅ Ticket status updated from **${oldStatus}** to **${newStatus}**.`,
            flags: 64
        });
    },

    async handleView(interaction) {
        const ticket = await ticketManager.getTicketByChannel(interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This is not a ticket channel.',
                flags: 64
            });
        }

        try {
            // Create the main embed with ticket information
            const embed = new EmbedBuilder()
                .setTitle(`🎫 Ticket #${ticket.ticketNumber}: ${ticket.title || 'No Title'}`)
                .setDescription(ticket.description || 'No description provided')
                .setColor(0x0099FF)
                .addFields(
                    { name: 'Status', value: ticket.status ? `\`${ticket.status}\`` : 'Open', inline: true },
                    { name: 'Type', value: ticket.ticketType ? `\`${ticket.ticketType}\`` : 'Not specified', inline: true },
                    { name: 'Created', value: ticket.createdAt ? `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:R>` : 'Unknown', inline: true },
                    { name: 'Created By', value: ticket.userId ? `<@${ticket.userId}>` : 'Unknown', inline: true }
                )
                .setTimestamp();

            // Add form responses if they exist
            if (ticket.responses && ticket.responses.length > 0) {
                embed.addFields({
                    name: '\u200B',
                    value: '**Form Responses**',
                    inline: false
                });

                ticket.responses.forEach((response, index) => {
                    if (response.question && response.answer) {
                        embed.addFields({
                            name: response.question,
                            value: response.answer.length > 1000 
                                ? response.answer.substring(0, 1000) + '...' 
                                : response.answer,
                            inline: false
                        });
                    }
                });
            }

            await interaction.reply({
                embeds: [embed],
                flags: 64
            });
        } catch (error) {
            console.error('Error displaying ticket details:', error);
            await interaction.reply({
                content: '❌ Failed to display ticket details. Please try again later.',
                flags: 64
            });
        }
    },

    async handleTranscript(interaction) {
        const ticket = await ticketManager.getTicketByChannel(interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This is not a ticket channel.',
                flags: 64
            });
        }

        await interaction.deferReply();

        try {
            const transcriptManager = require('../utils/transcriptManager');
            const transcript = await transcriptManager.generateTranscript(interaction.channel, ticket);
            
            await interaction.followUp({
                content: '📄 Here\'s the transcript of this ticket:',
                files: [transcript],
                flags: 64
            });
        } catch (error) {
            console.error('Error generating transcript:', error);
            await interaction.followUp({
                content: '❌ Failed to generate transcript. Please try again later.',
                flags: 64
            });
        }
    }
};
