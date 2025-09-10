const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with the bot commands'),

    async execute(interaction) {
        // Create an embed with command information
        const helpEmbed = new EmbedBuilder()
            .setTitle('🎫 Ticket Bot Help')
            .setDescription('Here are all the available commands and their descriptions. Use the dropdown menus for detailed usage.')
            .setColor(0x0099FF)
            .addFields(
                // Ticket System Commands
                {
                    name: '🎫 Ticket System',
                    value: '`/ticket` - Main ticket command with subcommands',
                    inline: false
                },
                {
                    name: '🛠️ Ticket Subcommands',
                    value: [
                        '`/ticket setup [channel]` - Setup the ticket system in a channel',
                        '`/ticket close` - Close the current ticket',
                        '`/ticket add [user]` - Add a user to the ticket',
                        '`/ticket remove [user]` - Remove a user from the ticket',
                        '`/ticket status [status]` - Update ticket status (open, in_progress, etc.)',
                        '`/ticket view` - View ticket details and form responses',
                        '`/ticket transcript` - Generate a transcript of the ticket'
                    ].join('\n'),
                    inline: false
                },
                // System Configuration
                {
                    name: '⚙️ System Configuration',
                    value: [
                        '`/system` - Configure the ticket system (admin only)',
                        '`/configure` - Interactive bot configuration menu (admin only)',
                        '`/logs [set|toggle]` - Configure logging channels and settings (admin only)'
                    ].join('\n'),
                    inline: false
                },
                // User Management
                {
                    name: '👥 User Management',
                    value: [
                        '`/add-client [user] [role]` - Assign client role to a user (admin only)',
                        '`/auto-role [role]` - Set up automatic role assignment for new members (admin only)',
                        '`/onboard [channel] [message]` - Set up onboarding messages for new members (admin only)'
                    ].join('\n'),
                    inline: false
                },
                // Reminder Commands
                {
                    name: '⏰ Reminder System',
                    value: [
                        '`/reminder create [message] [time]` - Create a new reminder',
                        '`/reminder list [filter]` - List your active reminders',
                        '`/reminder delete [reminder_id]` - Delete a specific reminder',
                        '`/reminder edit [reminder_id] [new_message] [new_time]` - Edit a reminder',
                        '`/reminder info [reminder_id]` - Get detailed info about a reminder',
                        '`/reminder snooze [reminder_id] [time]` - Snooze a reminder'
                    ].join('\n'),
                    inline: false
                },
                // Utility Commands
                {
                    name: '🔧 Utility',
                    value: [
                        '`/say [channel] [message]` - Send a message as the bot (admin only)',
                        '`/help` - Show this help message',
                        '`/ping` - Check if the bot is online'
                    ].join('\n'),
                    inline: false
                },
                // Status Options
                {
                    name: '📊 Ticket Status Options',
                    value: [
                        '`open` - New ticket',
                        '`in_progress` - Work in progress',
                        '`awaiting_client` - Waiting for client response',
                        '`testing` - In testing phase',
                        '`completed` - Ticket resolved',
                        '`on_hold` - Pending further action'
                    ].join('\n'),
                    inline: true
                },
                // Reminder Time Formats
                {
                    name: '⏰ Reminder Time Formats',
                    value: [
                        '`in 30m` - 30 minutes from now',
                        '`in 2h` - 2 hours from now',
                        '`tomorrow at 3pm` - Tomorrow at 3 PM',
                        '`2024-12-25 15:30` - Specific date/time',
                        '`next monday` - Next Monday',
                        '`daily`, `weekly`, `monthly` - Repeating reminders'
                    ].join('\n'),
                    inline: true
                },
                // Permission Requirements
                {
                    name: '🔒 Required Permissions',
                    value: [
                        '`Administrator` - System configuration',
                        '`Manage Channels` - Ticket management',
                        '`Manage Messages` - Message handling',
                        '`View Channel` - Channel access',
                        '`Send Messages` - Communication',
                        '`Read Message History` - Ticket history'
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({ 
                text: 'Tip: Use / before each command to see detailed usage and options',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Send the help embed
        await interaction.reply({
            embeds: [helpEmbed],
            ephemeral: true  // Only visible to the command user
        });
    }
};
