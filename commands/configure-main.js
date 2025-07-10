const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure')
        .setDescription('Configure the ticket bot - live editing system'),

    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need administrator permissions to configure the ticket system.',
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Bot Configuration')
            .setDescription('Choose what you want to configure:')
            .setColor(0x0099FF)
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('config_main_select')
            .setPlaceholder('Select what you want to configure')
            .addOptions([
                {
                    label: 'Setup Embed',
                    value: 'setup_embed',
                    emoji: '🎨',
                    description: 'Customize the ticket creation embed'
                },
                {
                    label: 'Ticket Types',
                    value: 'ticket_types',
                    emoji: '🎫',
                    description: 'Manage ticket categories and types'
                },
                {
                    label: 'Status Messages',
                    value: 'status_messages',
                    emoji: '📊',
                    description: 'Edit automated status update messages'
                },
                {
                    label: 'Bot Messages',
                    value: 'bot_messages',
                    emoji: '💬',
                    description: 'Customize all bot response messages'
                },
                {
                    label: 'Colors',
                    value: 'colors',
                    emoji: '🌈',
                    description: 'Customize embed colors'
                },
                {
                    label: 'Export Config',
                    value: 'export_config',
                    emoji: '📥',
                    description: 'Download current configuration'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: 64
        });
    }
};