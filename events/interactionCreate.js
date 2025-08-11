const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const ticketManager = require('../utils/ticketManager');
const config = require('../config.json');
const database = require('../utils/database');

function getTypeConfig(ticketType) {
    if (ticketType === 'custom') {
        return {
            id: 'custom',
            label: 'Create Ticket',
            name: 'Support',
            emoji: '🎫',
            description: 'Provide details for your request',
            color: '0x0099FF',
            questions: [
                {
                    id: 'subject',
                    label: 'Brief subject of your request',
                    placeholder: 'E.g., Unban appeal, Billing question, Bug report',
                    style: 'Short',
                    required: true,
                    maxLength: 100,
                },
                {
                    id: 'details',
                    label: 'Please describe your request',
                    placeholder: 'Add as much detail as possible...',
                    style: 'Paragraph',
                    required: true,
                    maxLength: 2000,
                },
            ],
        };
    }
    const t = config.ticketTypes[ticketType];
    if (!t) return null;
    return { ...t, name: t.label };
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
            await handleButton(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModal(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        }
    },
};

async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        const errorMessage = 'There was an error while executing this command!';
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, flags: 64 });
            } else {
                await interaction.reply({ content: errorMessage, flags: 64 });
            }
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
}

async function handleButton(interaction) {
    if (interaction.customId.startsWith('create_ticket_')) {
        const ticketType = interaction.customId.replace('create_ticket_', '');
        await handleCreateTicket(interaction, ticketType);
    } else if (interaction.customId === 'create_ticket') {
        await handleCreateTicket(interaction, 'custom');
    } else if (interaction.customId === 'close_ticket') {
        await handleCloseTicket(interaction);
    } else if (interaction.customId.startsWith('status_')) {
        await handleStatusChange(interaction);
    } else if (interaction.customId === 'edit_setup_embed') {
        await handleEditSetupEmbedButton(interaction);
    }
}

async function handleCreateTicket(interaction, ticketType = 'website') {
    // REMOVED: Single ticket limitation - users can now create multiple tickets

    // Get ticket type configuration
    const typeConfig = getTypeConfig(ticketType);
    if (!typeConfig) {
        return interaction.reply({
            content: '❌ Invalid ticket type.',
            flags: 64
        });
    }

    // Show modal for collecting project information
    const modal = new ModalBuilder()
        .setCustomId(`ticket_form_${ticketType}`)
        .setTitle(typeConfig.description);

    // Create inputs based on ticket type configuration
    const rows = [];
    const maxInputsPerModal = 5; // Discord modal limit

    typeConfig.questions.slice(0, maxInputsPerModal).forEach(question => {
        const input = new TextInputBuilder()
            .setCustomId(question.id)
            .setLabel(question.label)
            .setStyle(question.style === 'Paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setPlaceholder(question.placeholder)
            .setRequired(question.required)
            .setMaxLength(question.maxLength);

        const row = new ActionRowBuilder().addComponents(input);
        rows.push(row);
    });

    modal.addComponents(rows);

    await interaction.showModal(modal);
}

async function handleModal(interaction) {
    if (interaction.customId.startsWith('ticket_form_')) {
        const ticketType = interaction.customId.replace('ticket_form_', '');
        await createTicketChannel(interaction, ticketType);
    } else if (interaction.customId === 'configure_setup_embed') {
        await handleConfigureSetupEmbed(interaction);
    } else if (interaction.customId === 'edit_setup_embed_modal') {
        await handleEditSetupEmbedModal(interaction);
  } else if (interaction.customId === 'system_setup_modal') {
    await handleSystemSetupModal(interaction);
    } else if (interaction.customId.startsWith('edit_ticket_type_')) {
        await handleEditTicketType(interaction);
    } else if (interaction.customId.startsWith('edit_status_')) {
        await handleEditStatusMessage(interaction);
    } else if (interaction.customId.startsWith('edit_message_')) {
        await handleEditMessage(interaction);
    } else if (interaction.customId.startsWith('edit_color_')) {
        await handleEditColor(interaction);
    } else if (interaction.customId.startsWith('add_ticket_type')) {
        await handleAddTicketType(interaction);
    }
}

async function createTicketChannel(interaction, ticketType = 'website') {
    // Get ticket type configuration
    const typeConfig = getTypeConfig(ticketType);
    
    // Ensure the bot has permissions to create channels
    const me = interaction.guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
            content: '❌ I need the Manage Channels permission to create ticket categories/channels. Please grant Manage Channels to my role and try again.',
            flags: 64,
        });
    }

    // Extract form data based on ticket type
    const formData = {};
    typeConfig.questions.forEach(question => {
        try {
            const value = interaction.fields.getTextInputValue(question.id);
            formData[question.id] = value || (question.required ? 'Not provided' : '');
        } catch (error) {
            if (question.required) {
                formData[question.id] = 'Not provided';
            }
        }
    });

    try {
        // Create ticket category if it doesn't exist
        let category = interaction.guild.channels.cache.find(c => c.name === 'tickets' && c.type === ChannelType.GuildCategory);
        
        if (!category) {
            try {
                category = await interaction.guild.channels.create({
                    name: 'tickets',
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                    ]
                });
            } catch (err) {
                return await interaction.reply({ content: '❌ I could not create the tickets category. Make sure I have Manage Channels permission and no channel naming restrictions.', flags: 64 });
            }
        }

        // Create ticket channel
        const ticketNumber = await ticketManager.getNextTicketNumber(interaction.guild.id);
        const channelName = `ticket-${ticketNumber}-${interaction.user.username}`;

        let ticketChannel;
        try {
            ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                        ],
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                        ],
                    },
                ],
            });
        } catch (err) {
            return await interaction.reply({ content: '❌ I could not create the ticket channel. Please ensure I have Manage Channels and Send Messages permissions.', flags: 64 });
        }

        // Create ticket in database
        const ticket = await ticketManager.createTicket({
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            channelId: ticketChannel.id,
            ticketType: ticketType,
            title: `${typeConfig.name} Request`,
            description: `${typeConfig.description} ticket created by ${interaction.user.tag}`,
            responses: Object.entries(formData).map(([key, value]) => ({
                question: typeConfig.questions.find(q => q.id === key)?.label || key,
                answer: value
            }))
        });

        // Send welcome message (simple for custom type)
        const subject = formData.subject || 'New Ticket';
        const details = formData.details || '';
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`🎫 Ticket #${ticket.ticketNumber} - ${subject}`)
            .setDescription('Ticket created. A team member will assist you here.')
            .addFields(
                ...(details ? [{ name: 'Details', value: details.length > 1024 ? details.slice(0, 1021) + '...' : details }] : [])
            )
            .setColor(0x0099FF);

        welcomeEmbed
            .setFooter({ text: `Ticket created on ${new Date().toLocaleString()}` })
            .setTimestamp();

        // Always only show a Close Ticket button; no status buttons, no extra text
        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({
            embeds: [welcomeEmbed],
            components: [closeRow]
        });

        await interaction.reply({ content: '✅ Your ticket has been created.', flags: 64 });

    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({
            content: '❌ Failed to create ticket. Please try again or contact an administrator.',
            flags: 64
        });
    }
}

async function handleCloseTicket(interaction) {
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

    await ticketManager.closeTicket(ticket._id, interaction.user.id);

    const embed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`This ticket has been closed by ${interaction.user}.\n\nChannel will be deleted in 10 seconds.`)
        .setColor(0xFF0000)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Delete channel after 10 seconds
    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (error) {
            console.error('Error deleting ticket channel:', error);
        }
    }, 10000);
}

async function handleStatusChange(interaction) {
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

    const newStatus = interaction.customId.replace('status_', '');
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
}

async function handleConfigureSetupEmbed(interaction) {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        const color = interaction.fields.getTextInputValue('color');
        const footer = interaction.fields.getTextInputValue('footer');
        const thumbnail = interaction.fields.getTextInputValue('thumbnail');

        // Read current config
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        // Update setup embed configuration
        config.setupEmbed.title = title;
        config.setupEmbed.description = description;
        config.setupEmbed.color = color;
        config.setupEmbed.footer.text = footer;
        if (thumbnail) config.setupEmbed.thumbnail = thumbnail;

        // Write updated config
        await fs.writeFile(configPath, JSON.stringify(config, null, 4));

        await interaction.reply({
            content: '✅ Setup embed configuration updated successfully! The changes will take effect on the next `/ticket setup` command.',
            flags: 64
        });
    } catch (error) {
        console.error('Error updating setup embed config:', error);
        await interaction.reply({
            content: '❌ Failed to update configuration. Please check your inputs and try again.',
            flags: 64
        });
    }
}

async function handleSystemSetupModal(interaction) {
    try {
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        const color = interaction.fields.getTextInputValue('color');
        const footer = interaction.fields.getTextInputValue('footer');
        const thumbnail = interaction.fields.getTextInputValue('thumbnail');

        // Save to MongoDB per guild
        const guildId = interaction.guild.id;
        let guildData = await database.getGuild(guildId);
        if (!guildData) {
            guildData = await database.saveGuild({ _id: guildId, name: interaction.guild.name });
        }
        const newConfig = guildData.config || {};
        const setupEmbed = newConfig.setupEmbed || {};
        setupEmbed.title = title;
        setupEmbed.description = description;
        setupEmbed.color = color;
        setupEmbed.footer = setupEmbed.footer || {};
        setupEmbed.footer.text = footer || '';
        if (thumbnail) setupEmbed.thumbnail = thumbnail;
        newConfig.setupEmbed = setupEmbed;
        guildData.config = newConfig;
        await database.saveGuild(guildData.toObject ? guildData.toObject() : guildData);

        // Immediately post the ticket panel in the current channel using saved values
        const setupConfig = setupEmbed;

        const embed = new EmbedBuilder()
            .setTitle(setupConfig.title)
            .setDescription(setupConfig.description)
            .setColor(parseInt(setupConfig.color, 16));

        if (setupConfig.fields && setupConfig.fields.length > 0) {
            setupConfig.fields.forEach(field => {
                embed.addFields({ name: field.name, value: field.value, inline: field.inline });
            });
        }

        if (setupConfig.footer && setupConfig.footer.text) {
            const footerOptions = { text: setupConfig.footer.text };
            if (setupConfig.footer.iconUrl) footerOptions.iconURL = setupConfig.footer.iconUrl;
            embed.setFooter(footerOptions);
        }

        if (setupConfig.thumbnail) embed.setThumbnail(setupConfig.thumbnail);
        if (setupConfig.image) embed.setImage(setupConfig.image);

        embed.setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Create Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝');

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.channel.send({ embeds: [embed], components: [row] });

        await interaction.reply({ content: '✅ Ticket system setup saved to database and posted here.', flags: 64 });
    } catch (error) {
        console.error('Error saving system setup:', error);
        await interaction.reply({ content: '❌ Failed to save. Please try again.', flags: 64 });
    }
}

async function handleSelectMenu(interaction) {
    const { customId, values } = interaction;
    const selectedValue = values[0];

    if (customId === 'config_main_select') {
        await handleConfigMainSelect(interaction, selectedValue);
    } else if (customId === 'ticket_type_select') {
        await handleTicketTypeSelect(interaction, selectedValue);
    } else if (customId === 'status_message_select') {
        await handleStatusMessageSelect(interaction, selectedValue);
    } else if (customId === 'message_select') {
        await handleMessageSelect(interaction, selectedValue);
    } else if (customId === 'color_select') {
        await handleColorSelect(interaction, selectedValue);
    } else if (customId === 'question_select') {
        await handleQuestionSelect(interaction, selectedValue);
    }
}

async function handleConfigMainSelect(interaction, value) {
    const config = require('../config.json');
    
    if (value === 'setup_embed') {
        const setupConfig = config.setupEmbed;
        
        const embed = new EmbedBuilder()
            .setTitle('🎨 Setup Embed Configuration')
            .setDescription('These are the current settings for your ticket setup embed:')
            .setColor(0x0099FF)
            .addFields(
                { name: 'Title', value: setupConfig.title, inline: true },
                { name: 'Description', value: setupConfig.description.substring(0, 100) + '...', inline: true },
                { name: 'Color', value: setupConfig.color, inline: true },
                { name: 'Footer', value: setupConfig.footer.text || 'None', inline: true }
            )
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId('edit_setup_embed')
            .setLabel('Edit Setup Embed')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️');

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } else if (value === 'ticket_types') {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Types Management')
            .setDescription('Manage your ticket types - add new ones, edit existing ones, or remove them.')
            .setColor(0x0099FF)
            .setTimestamp();

        Object.entries(config.ticketTypes).forEach(([key, type]) => {
            const questionCount = type.questions ? type.questions.length : 0;
            embed.addFields({
                name: `${type.emoji} ${type.label}`,
                value: `**ID:** ${key}\n**Description:** ${type.description}\n**Questions:** ${questionCount}\n**Color:** ${type.color}`,
                inline: true
            });
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_type_select')
            .setPlaceholder('Choose a ticket type to edit')
            .addOptions([
                {
                    label: 'Add New Ticket Type',
                    value: 'add_new',
                    emoji: '➕',
                    description: 'Create a new ticket type'
                },
                ...Object.entries(config.ticketTypes).map(([key, type]) => {
                    // Only use valid single emoji characters
                    const validEmoji = type.emoji && type.emoji.length <= 2 && !/:/g.test(type.emoji) ? type.emoji : '📝';
                    return {
                        label: `Edit ${type.label}`,
                        value: `edit_${key}`,
                        emoji: validEmoji,
                        description: `Edit ${type.label} configuration`
                    };
                })
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } else if (value === 'status_messages') {
        const embed = new EmbedBuilder()
            .setTitle('📊 Status Messages Configuration')
            .setColor(0x0099FF)
            .setDescription('Edit automated status messages that are sent when ticket status changes.')
            .setTimestamp();

        Object.entries(config.statusMessages).forEach(([status, data]) => {
            const statusName = status.replace('_', ' ').toUpperCase();
            const emojis = {
                'open': '📝',
                'in_progress': '🚀',
                'awaiting_client': '⏳',
                'testing': '🧪',
                'completed': '✅',
                'on_hold': '⏸️'
            };
            const emoji = emojis[status] || '📊';
            embed.addFields({
                name: `${emoji} ${statusName}`,
                value: `**Message:** ${data.message.substring(0, 100)}...\n**Color:** ${data.color}`,
                inline: false
            });
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('status_message_select')
            .setPlaceholder('Choose a status message to edit')
            .addOptions(
                Object.entries(config.statusMessages).map(([status, data]) => {
                    const emojis = {
                        'open': '📝',
                        'in_progress': '🚀',
                        'awaiting_client': '⏳',
                        'testing': '🧪',
                        'completed': '✅',
                        'on_hold': '⏸️'
                    };
                    const emoji = emojis[status] || '📊';
                    return {
                        label: `Edit ${status.replace('_', ' ').toUpperCase()}`,
                        value: `edit_status_${status}`,
                        emoji: emoji,
                        description: `Edit ${status.replace('_', ' ')} status message`
                    };
                })
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } else if (value === 'bot_messages') {
        const embed = new EmbedBuilder()
            .setTitle('💬 Bot Messages Configuration')
            .setColor(0x0099FF)
            .setDescription('Edit all bot response messages.')
            .setTimestamp();

        Object.entries(config.messages).forEach(([key, message]) => {
            embed.addFields({
                name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                value: `"${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
                inline: false
            });
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('message_select')
            .setPlaceholder('Choose a message to edit')
            .addOptions(
                Object.entries(config.messages).map(([key, message]) => ({
                    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                    value: `edit_message_${key}`,
                    description: `Edit ${key} message`
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } else if (value === 'colors') {
        const embed = new EmbedBuilder()
            .setTitle('🌈 Color Configuration')
            .setColor(0x0099FF)
            .setDescription('Customize embed colors throughout the bot.')
            .setTimestamp();

        Object.entries(config.embeds).forEach(([key, color]) => {
            embed.addFields({
                name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                value: `**Color:** ${color}`,
                inline: true
            });
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('color_select')
            .setPlaceholder('Choose a color to edit')
            .addOptions(
                Object.entries(config.embeds).map(([key, color]) => ({
                    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                    value: `edit_color_${key}`,
                    description: `Edit ${key} color (${color})`
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } else if (value === 'export_config') {
        const configData = JSON.stringify(config, null, 2);
        const buffer = Buffer.from(configData, 'utf8');
        
        await interaction.update({
            content: '📥 Here is your current configuration file:',
            files: [{
                attachment: buffer,
                name: 'config.json'
            }],
            embeds: [],
            components: []
        });
    }
}

async function handleEditSetupEmbedButton(interaction) {
    const config = require('../config.json');
    const setupConfig = config.setupEmbed;
    
    const modal = new ModalBuilder()
        .setCustomId('edit_setup_embed_modal')
        .setTitle('Edit Setup Embed');

    const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Embed Title')
        .setStyle(TextInputStyle.Short)
        .setValue(setupConfig.title)
        .setRequired(true)
        .setMaxLength(256);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Embed Description')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(setupConfig.description)
        .setRequired(true)
        .setMaxLength(2048);

    const colorInput = new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Embed Color (hex code, e.g., 0x0099FF)')
        .setStyle(TextInputStyle.Short)
        .setValue(setupConfig.color)
        .setRequired(true)
        .setMaxLength(10);

    const footerInput = new TextInputBuilder()
        .setCustomId('footer')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setValue(setupConfig.footer.text || '')
        .setRequired(false)
        .setMaxLength(2048);

    const thumbnailInput = new TextInputBuilder()
        .setCustomId('thumbnail')
        .setLabel('Thumbnail URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setValue(setupConfig.thumbnail || '')
        .setRequired(false)
        .setMaxLength(500);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(footerInput),
        new ActionRowBuilder().addComponents(thumbnailInput)
    );

    await interaction.showModal(modal);
}

async function handleEditSetupEmbedModal(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        const color = interaction.fields.getTextInputValue('color');
        const footer = interaction.fields.getTextInputValue('footer');
        const thumbnail = interaction.fields.getTextInputValue('thumbnail');

        // Read current config
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        // Update setup embed configuration
        config.setupEmbed.title = title;
        config.setupEmbed.description = description;
        config.setupEmbed.color = color;
        config.setupEmbed.footer.text = footer;
        if (thumbnail) config.setupEmbed.thumbnail = thumbnail;

        // Write updated config
        await fs.writeFile(configPath, JSON.stringify(config, null, 4));

        await interaction.reply({
            content: '✅ Setup embed configuration updated successfully! The changes will take effect on the next `/ticket setup` command.',
            flags: 64
        });
    } catch (error) {
        console.error('Error updating setup embed config:', error);
        await interaction.reply({
            content: '❌ Failed to update configuration. Please check your inputs and try again.',
            flags: 64
        });
    }
}

async function handleTicketTypeSelect(interaction, value) {
    const fs = require('fs').promises;
    const path = require('path');
    
    if (value === 'add_new') {
        const modal = new ModalBuilder()
            .setCustomId('add_ticket_type')
            .setTitle('Add New Ticket Type');

        const idInput = new TextInputBuilder()
            .setCustomId('type_id')
            .setLabel('Ticket Type ID (no spaces)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., consultation, maintenance')
            .setRequired(true)
            .setMaxLength(50);

        const labelInput = new TextInputBuilder()
            .setCustomId('type_label')
            .setLabel('Display Label')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., Consultation, Maintenance')
            .setRequired(true)
            .setMaxLength(100);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('type_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., Get consultation for your project')
            .setRequired(true)
            .setMaxLength(200);

        const emojiInput = new TextInputBuilder()
            .setCustomId('type_emoji')
            .setLabel('Emoji')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 💡')
            .setRequired(true)
            .setMaxLength(10);

        const colorInput = new TextInputBuilder()
            .setCustomId('type_color')
            .setLabel('Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 0x0099FF')
            .setRequired(true)
            .setMaxLength(10);

        modal.addComponents(
            new ActionRowBuilder().addComponents(idInput),
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(emojiInput),
            new ActionRowBuilder().addComponents(colorInput)
        );

        await interaction.showModal(modal);
    } else if (value.startsWith('edit_')) {
        const typeId = value.replace('edit_', '');
        const config = require('../config.json');
        const ticketType = config.ticketTypes[typeId];

        const modal = new ModalBuilder()
            .setCustomId(`edit_ticket_type_${typeId}`)
            .setTitle(`Edit ${ticketType.label}`);

        const labelInput = new TextInputBuilder()
            .setCustomId('type_label')
            .setLabel('Display Label')
            .setStyle(TextInputStyle.Short)
            .setValue(ticketType.label)
            .setRequired(true)
            .setMaxLength(100);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('type_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Short)
            .setValue(ticketType.description)
            .setRequired(true)
            .setMaxLength(200);

        const emojiInput = new TextInputBuilder()
            .setCustomId('type_emoji')
            .setLabel('Emoji')
            .setStyle(TextInputStyle.Short)
            .setValue(ticketType.emoji)
            .setRequired(true)
            .setMaxLength(10);

        const colorInput = new TextInputBuilder()
            .setCustomId('type_color')
            .setLabel('Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setValue(ticketType.color)
            .setRequired(true)
            .setMaxLength(10);

        modal.addComponents(
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(emojiInput),
            new ActionRowBuilder().addComponents(colorInput)
        );

        await interaction.showModal(modal);
    }
}

async function handleStatusMessageSelect(interaction, value) {
    const statusId = value.replace('edit_status_', '');
    const config = require('../config.json');
    const statusData = config.statusMessages[statusId];

    const modal = new ModalBuilder()
        .setCustomId(`edit_status_${statusId}`)
        .setTitle(`Edit ${statusId.replace('_', ' ').toUpperCase()} Status`);

    const messageInput = new TextInputBuilder()
        .setCustomId('status_message')
        .setLabel('Status Message')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(statusData.message)
        .setRequired(true)
        .setMaxLength(1000);

    const colorInput = new TextInputBuilder()
        .setCustomId('status_color')
        .setLabel('Color (hex code)')
        .setStyle(TextInputStyle.Short)
        .setValue(statusData.color)
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(
        new ActionRowBuilder().addComponents(messageInput),
        new ActionRowBuilder().addComponents(colorInput)
    );

    await interaction.showModal(modal);
}

async function handleMessageSelect(interaction, value) {
    const messageId = value.replace('edit_message_', '');
    const config = require('../config.json');
    const message = config.messages[messageId];

    const modal = new ModalBuilder()
        .setCustomId(`edit_message_${messageId}`)
        .setTitle(`Edit ${messageId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`);

    const messageInput = new TextInputBuilder()
        .setCustomId('message_content')
        .setLabel('Message Content')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(message)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(messageInput)
    );

    await interaction.showModal(modal);
}

async function handleColorSelect(interaction, value) {
    const colorId = value.replace('edit_color_', '');
    const config = require('../config.json');
    const color = config.embeds[colorId];

    const modal = new ModalBuilder()
        .setCustomId(`edit_color_${colorId}`)
        .setTitle(`Edit ${colorId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Color`);

    const colorInput = new TextInputBuilder()
        .setCustomId('color_value')
        .setLabel('Color (hex code)')
        .setStyle(TextInputStyle.Short)
        .setValue(color)
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(
        new ActionRowBuilder().addComponents(colorInput)
    );

    await interaction.showModal(modal);
}

async function handleQuestionSelect(interaction, value) {
    const typeId = value.replace('edit_questions_', '');
    const config = require('../config.json');
    const ticketType = config.ticketTypes[typeId];

    const embed = new EmbedBuilder()
        .setTitle(`❓ Questions for ${ticketType.label}`)
        .setDescription('Current questions for this ticket type:')
        .setColor(0x0099FF);

    ticketType.questions.forEach((question, index) => {
        embed.addFields({
            name: `Question ${index + 1}: ${question.label}`,
            value: `**ID:** ${question.id}\n**Style:** ${question.style}\n**Required:** ${question.required ? 'Yes' : 'No'}\n**Max Length:** ${question.maxLength}`,
            inline: false
        });
    });

    const addButton = new ButtonBuilder()
        .setCustomId(`add_question_${typeId}`)
        .setLabel('Add Question')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(addButton);

    await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: 64
    });
}

async function handleAddTicketType(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const typeId = interaction.fields.getTextInputValue('type_id');
    const label = interaction.fields.getTextInputValue('type_label');
    const description = interaction.fields.getTextInputValue('type_description');
    const emoji = interaction.fields.getTextInputValue('type_emoji');
    const color = interaction.fields.getTextInputValue('type_color');

    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        if (config.ticketTypes[typeId]) {
            return interaction.reply({
                content: `❌ Ticket type "${typeId}" already exists.`,
                flags: 64
            });
        }

        config.ticketTypes[typeId] = {
            label,
            emoji,
            description,
            color,
            questions: [
                {
                    id: 'description',
                    label: 'Please describe your request',
                    placeholder: 'Provide details about what you need help with...',
                    style: 'Paragraph',
                    required: true,
                    maxLength: 2000
                }
            ]
        };

        await fs.writeFile(configPath, JSON.stringify(config, null, 4));

        await interaction.reply({
            content: `✅ New ticket type "${label}" has been added successfully!`,
            flags: 64
        });
    } catch (error) {
        console.error('Error adding ticket type:', error);
        await interaction.reply({
            content: '❌ Failed to add ticket type. Please try again.',
            flags: 64
        });
    }
}

async function handleEditTicketType(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const typeId = interaction.customId.replace('edit_ticket_type_', '');
    const label = interaction.fields.getTextInputValue('type_label');
    const description = interaction.fields.getTextInputValue('type_description');
    const emoji = interaction.fields.getTextInputValue('type_emoji');
    const color = interaction.fields.getTextInputValue('type_color');

    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        config.ticketTypes[typeId].label = label;
        config.ticketTypes[typeId].description = description;
        config.ticketTypes[typeId].emoji = emoji;
        config.ticketTypes[typeId].color = color;

        await fs.writeFile(configPath, JSON.stringify(config, null, 4));

        await interaction.reply({
            content: `✅ Ticket type "${label}" has been updated successfully!`,
            flags: 64
        });
    } catch (error) {
        console.error('Error updating ticket type:', error);
        await interaction.reply({
            content: '❌ Failed to update ticket type. Please try again.',
            flags: 64
        });
    }
}

async function handleEditStatusMessage(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const statusId = interaction.customId.replace('edit_status_', '');
    const message = interaction.fields.getTextInputValue('status_message');
    const color = interaction.fields.getTextInputValue('status_color');

    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        config.statusMessages[statusId].message = message;
        config.statusMessages[statusId].color = color;

        await fs.writeFile(configPath, JSON.stringify(config, null, 4));

        await interaction.reply({
            content: `✅ Status message for "${statusId.replace('_', ' ').toUpperCase()}" has been updated successfully!`,
            flags: 64
        });
    } catch (error) {
        console.error('Error updating status message:', error);
        await interaction.reply({
            content: '❌ Failed to update status message. Please try again.',
            flags: 64
        });
    }
}

async function handleEditMessage(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const messageId = interaction.customId.replace('edit_message_', '');
    const content = interaction.fields.getTextInputValue('message_content');

    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        config.messages[messageId] = content;

        await fs.writeFile(configPath, JSON.stringify(config, null, 4));

        await interaction.reply({
            content: `✅ Message "${messageId}" has been updated successfully!`,
            flags: 64
        });
    } catch (error) {
        console.error('Error updating message:', error);
        await interaction.reply({
            content: '❌ Failed to update message. Please try again.',
            flags: 64
        });
    }
}

async function handleEditColor(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const colorId = interaction.customId.replace('edit_color_', '');
    const color = interaction.fields.getTextInputValue('color_value');

    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        config.embeds[colorId] = color;

        await fs.writeFile(configPath, JSON.stringify(config, null, 4));

        await interaction.reply({
            content: `✅ Color "${colorId}" has been updated successfully!`,
            flags: 64
        });
    } catch (error) {
        console.error('Error updating color:', error);
        await interaction.reply({
            content: '❌ Failed to update color. Please try again.',
            flags: 64
        });
    }
}
