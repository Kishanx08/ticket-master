const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../utils/database');
const timezoneUtils = require('../utils/timezoneUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Manage your reminders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new reminder')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Reminder message')
                        .setRequired(true)
                        .setMaxLength(2000))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('When to trigger the reminder (e.g., "in 30m", "tomorrow at 3pm", "2024-12-25 15:30")')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send reminder to (defaults to current channel)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('repeat')
                        .setDescription('Repeat interval')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' },
                            { name: 'Monthly', value: 'monthly' },
                            { name: 'Yearly', value: 'yearly' },
                            { name: 'Custom', value: 'custom' }
                        ))
                .addStringOption(option =>
                    option.setName('custom_repeat')
                        .setDescription('Custom repeat pattern (e.g., "every 2 days", "every monday")')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List your active reminders')
                .addStringOption(option =>
                    option.setName('filter')
                        .setDescription('Filter reminders')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Today', value: 'today' },
                            { name: 'This Week', value: 'week' },
                            { name: 'Repeating', value: 'repeating' }
                        ))
                .addStringOption(option =>
                    option.setName('sort')
                        .setDescription('Sort order')
                        .setRequired(false)
                        .addChoices(
                            { name: 'By Time', value: 'time' },
                            { name: 'By Created', value: 'created' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a reminder')
                .addStringOption(option =>
                    option.setName('reminder_id')
                        .setDescription('Reminder ID to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a reminder')
                .addStringOption(option =>
                    option.setName('reminder_id')
                        .setDescription('Reminder ID to edit')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('new_message')
                        .setDescription('New reminder message')
                        .setRequired(false)
                        .setMaxLength(2000))
                .addStringOption(option =>
                    option.setName('new_time')
                        .setDescription('New trigger time')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a specific reminder')
                .addStringOption(option =>
                    option.setName('reminder_id')
                        .setDescription('Reminder ID to get info about')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('snooze')
                .setDescription('Snooze a reminder')
                .addStringOption(option =>
                    option.setName('reminder_id')
                        .setDescription('Reminder ID to snooze')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('How long to snooze (e.g., "15m", "1h", "2d")')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await this.handleCreate(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'delete':
                    await this.handleDelete(interaction);
                    break;
                case 'edit':
                    await this.handleEdit(interaction);
                    break;
                case 'info':
                    await this.handleInfo(interaction);
                    break;
                case 'snooze':
                    await this.handleSnooze(interaction);
                    break;
            }
        } catch (error) {
            console.error('Error in reminder command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    },

    async handleCreate(interaction) {
        const message = interaction.options.getString('message');
        const timeString = interaction.options.getString('time');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const repeatInterval = interaction.options.getString('repeat');
        const customRepeat = interaction.options.getString('custom_repeat');

        // Detect user's timezone from Discord locale
        const userLocale = interaction.user.locale || 'en-US';
        const timezone = timezoneUtils.detectTimezoneFromLocale(userLocale);

        // Parse the time string
        const triggerTime = timezoneUtils.parseTimeString(timeString, timezone);
        
        if (!triggerTime) {
            return interaction.reply({
                content: '❌ Invalid time format. Please use formats like "in 30m", "tomorrow at 3pm", or "2024-12-25 15:30".',
                ephemeral: true
            });
        }

        // Check if time is in the past
        if (triggerTime <= new Date()) {
            return interaction.reply({
                content: '❌ Reminder time must be in the future.',
                ephemeral: true
            });
        }

        // Validate repeat settings
        if (repeatInterval === 'custom' && !customRepeat) {
            return interaction.reply({
                content: '❌ Custom repeat pattern is required when using custom repeat interval.',
                ephemeral: true
            });
        }

        // Create reminder data
        const reminderData = {
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            channelId: channel.id,
            message: message,
            triggerTime: triggerTime,
            originalTime: timeString,
            timezone: timezone,
            isRepeating: !!repeatInterval,
            repeatInterval: repeatInterval,
            customRepeatPattern: customRepeat,
            isActive: true
        };

        // Save reminder to database
        const reminder = await database.createReminder(reminderData);
        
        if (!reminder) {
            return interaction.reply({
                content: '❌ Failed to create reminder. Please try again.',
                ephemeral: true
            });
        }

        // Create confirmation embed
        const embed = new EmbedBuilder()
            .setTitle('✅ Reminder Created')
            .setDescription(`**Message:** ${message}`)
            .setColor(0x00FF00)
            .addFields(
                {
                    name: 'Trigger Time',
                    value: `<t:${Math.floor(triggerTime.getTime() / 1000)}:F>`,
                    inline: true
                },
                {
                    name: 'Timezone',
                    value: timezoneUtils.getTimezoneName(timezone),
                    inline: true
                },
                {
                    name: 'Channel',
                    value: channel.toString(),
                    inline: true
                },
                {
                    name: 'Reminder ID',
                    value: `\`${reminder._id}\``,
                    inline: false
                }
            );

        if (repeatInterval) {
            embed.addFields({
                name: 'Repeats',
                value: repeatInterval === 'custom' ? customRepeat : repeatInterval,
                inline: true
            });
        }

        embed.setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },

    async handleList(interaction) {
        const filter = interaction.options.getString('filter') || 'all';
        const sort = interaction.options.getString('sort') || 'time';

        // Get user's reminders
        const reminders = await database.getUserReminders(interaction.user.id, interaction.guild.id);
        
        if (reminders.length === 0) {
            return interaction.reply({
                content: '📝 You have no active reminders.',
                ephemeral: true
            });
        }

        // Apply filters
        let filteredReminders = reminders;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        switch (filter) {
            case 'today':
                filteredReminders = reminders.filter(r => {
                    const reminderDate = new Date(r.triggerTime);
                    return reminderDate >= today && reminderDate < weekFromNow;
                });
                break;
            case 'week':
                filteredReminders = reminders.filter(r => {
                    const reminderDate = new Date(r.triggerTime);
                    return reminderDate >= today && reminderDate < weekFromNow;
                });
                break;
            case 'repeating':
                filteredReminders = reminders.filter(r => r.isRepeating);
                break;
        }

        if (filteredReminders.length === 0) {
            return interaction.reply({
                content: `📝 No reminders found for filter: ${filter}`,
                ephemeral: true
            });
        }

        // Sort reminders
        if (sort === 'created') {
            filteredReminders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else {
            filteredReminders.sort((a, b) => new Date(a.triggerTime) - new Date(b.triggerTime));
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle('📝 Your Reminders')
            .setColor(0x0099FF)
            .setFooter({ 
                text: `Showing ${filteredReminders.length} of ${reminders.length} reminders`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        // Add reminders to embed (max 25 fields)
        const maxFields = Math.min(filteredReminders.length, 25);
        for (let i = 0; i < maxFields; i++) {
            const reminder = filteredReminders[i];
            const triggerTime = new Date(reminder.triggerTime);
            const timeString = `<t:${Math.floor(triggerTime.getTime() / 1000)}:R>`;
            
            let value = `**Time:** ${timeString}\n`;
            value += `**Channel:** <#${reminder.channelId}>\n`;
            value += `**ID:** \`${reminder._id}\``;
            
            if (reminder.isRepeating) {
                value += `\n**Repeats:** ${reminder.repeatInterval === 'custom' ? reminder.customRepeatPattern : reminder.repeatInterval}`;
            }

            embed.addFields({
                name: `${i + 1}. ${reminder.message.length > 50 ? reminder.message.substring(0, 50) + '...' : reminder.message}`,
                value: value,
                inline: false
            });
        }

        if (filteredReminders.length > 25) {
            embed.setDescription(`*Showing first 25 reminders. Use filters to narrow down results.*`);
        }

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },

    async handleDelete(interaction) {
        const reminderId = interaction.options.getString('reminder_id');

        // Get the reminder
        const reminder = await database.getReminder(reminderId);
        
        if (!reminder) {
            return interaction.reply({
                content: '❌ Reminder not found.',
                ephemeral: true
            });
        }

        // Check if user owns the reminder
        if (reminder.userId !== interaction.user.id) {
            return interaction.reply({
                content: '❌ You can only delete your own reminders.',
                ephemeral: true
            });
        }

        // Delete the reminder
        const deleted = await database.deleteReminder(reminderId);
        
        if (!deleted) {
            return interaction.reply({
                content: '❌ Failed to delete reminder. Please try again.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Reminder Deleted')
            .setDescription(`**Message:** ${reminder.message}`)
            .setColor(0xFF0000)
            .addFields({
                name: 'Was scheduled for',
                value: `<t:${Math.floor(new Date(reminder.triggerTime).getTime() / 1000)}:F>`,
                inline: true
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },

    async handleEdit(interaction) {
        const reminderId = interaction.options.getString('reminder_id');
        const newMessage = interaction.options.getString('new_message');
        const newTime = interaction.options.getString('new_time');

        // Get the reminder
        const reminder = await database.getReminder(reminderId);
        
        if (!reminder) {
            return interaction.reply({
                content: '❌ Reminder not found.',
                ephemeral: true
            });
        }

        // Check if user owns the reminder
        if (reminder.userId !== interaction.user.id) {
            return interaction.reply({
                content: '❌ You can only edit your own reminders.',
                ephemeral: true
            });
        }

        // Prepare updates
        const updates = {};
        
        if (newMessage) {
            updates.message = newMessage;
        }
        
        if (newTime) {
            const userLocale = interaction.user.locale || 'en-US';
            const timezone = timezoneUtils.detectTimezoneFromLocale(userLocale);
            const triggerTime = timezoneUtils.parseTimeString(newTime, timezone);
            
            if (!triggerTime) {
                return interaction.reply({
                    content: '❌ Invalid time format. Please use formats like "in 30m", "tomorrow at 3pm", or "2024-12-25 15:30".',
                    ephemeral: true
                });
            }

            if (triggerTime <= new Date()) {
                return interaction.reply({
                    content: '❌ New reminder time must be in the future.',
                    ephemeral: true
                });
            }

            updates.triggerTime = triggerTime;
            updates.originalTime = newTime;
        }

        if (Object.keys(updates).length === 0) {
            return interaction.reply({
                content: '❌ Please provide either a new message or new time to edit.',
                ephemeral: true
            });
        }

        // Update the reminder
        const updatedReminder = await database.updateReminder(reminderId, updates);
        
        if (!updatedReminder) {
            return interaction.reply({
                content: '❌ Failed to update reminder. Please try again.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('✏️ Reminder Updated')
            .setDescription(`**Message:** ${updatedReminder.message}`)
            .setColor(0xFFA500)
            .addFields(
                {
                    name: 'Trigger Time',
                    value: `<t:${Math.floor(new Date(updatedReminder.triggerTime).getTime() / 1000)}:F>`,
                    inline: true
                },
                {
                    name: 'Timezone',
                    value: timezoneUtils.getTimezoneName(updatedReminder.timezone),
                    inline: true
                },
                {
                    name: 'Reminder ID',
                    value: `\`${updatedReminder._id}\``,
                    inline: false
                }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },

    async handleInfo(interaction) {
        const reminderId = interaction.options.getString('reminder_id');

        // Get the reminder
        const reminder = await database.getReminder(reminderId);
        
        if (!reminder) {
            return interaction.reply({
                content: '❌ Reminder not found.',
                ephemeral: true
            });
        }

        // Check if user owns the reminder
        if (reminder.userId !== interaction.user.id) {
            return interaction.reply({
                content: '❌ You can only view your own reminders.',
                ephemeral: true
            });
        }

        const triggerTime = new Date(reminder.triggerTime);
        const createdTime = new Date(reminder.createdAt);

        const embed = new EmbedBuilder()
            .setTitle('ℹ️ Reminder Information')
            .setDescription(reminder.message)
            .setColor(0x0099FF)
            .addFields(
                {
                    name: 'Trigger Time',
                    value: `<t:${Math.floor(triggerTime.getTime() / 1000)}:F>`,
                    inline: true
                },
                {
                    name: 'Created',
                    value: `<t:${Math.floor(createdTime.getTime() / 1000)}:R>`,
                    inline: true
                },
                {
                    name: 'Timezone',
                    value: timezoneUtils.getTimezoneName(reminder.timezone),
                    inline: true
                },
                {
                    name: 'Channel',
                    value: `<#${reminder.channelId}>`,
                    inline: true
                },
                {
                    name: 'Status',
                    value: reminder.isActive ? '✅ Active' : '❌ Inactive',
                    inline: true
                },
                {
                    name: 'Reminder ID',
                    value: `\`${reminder._id}\``,
                    inline: true
                }
            );

        if (reminder.isRepeating) {
            embed.addFields({
                name: 'Repeats',
                value: reminder.repeatInterval === 'custom' ? reminder.customRepeatPattern : reminder.repeatInterval,
                inline: true
            });
        }

        if (reminder.isSnoozed) {
            embed.addFields({
                name: 'Snoozed',
                value: `${reminder.snoozeCount} time(s)`,
                inline: true
            });
        }

        embed.setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },

    async handleSnooze(interaction) {
        const reminderId = interaction.options.getString('reminder_id');
        const timeString = interaction.options.getString('time');

        // Get the reminder
        const reminder = await database.getReminder(reminderId);
        
        if (!reminder) {
            return interaction.reply({
                content: '❌ Reminder not found.',
                ephemeral: true
            });
        }

        // Check if user owns the reminder
        if (reminder.userId !== interaction.user.id) {
            return interaction.reply({
                content: '❌ You can only snooze your own reminders.',
                ephemeral: true
            });
        }

        // Parse snooze time
        const userLocale = interaction.user.locale || 'en-US';
        const timezone = timezoneUtils.detectTimezoneFromLocale(userLocale);
        const snoozeTime = timezoneUtils.parseTimeString(timeString, timezone);
        
        if (!snoozeTime) {
            return interaction.reply({
                content: '❌ Invalid snooze time format. Please use formats like "15m", "1h", or "2d".',
                ephemeral: true
            });
        }

        // Calculate new trigger time
        const now = new Date();
        const snoozeDuration = snoozeTime.getTime() - now.getTime();
        const newTriggerTime = new Date(now.getTime() + snoozeDuration);

        // Snooze the reminder
        const snoozedReminder = await database.snoozeReminder(reminderId, newTriggerTime);
        
        if (!snoozedReminder) {
            return interaction.reply({
                content: '❌ Failed to snooze reminder. Please try again.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('😴 Reminder Snoozed')
            .setDescription(`**Message:** ${reminder.message}`)
            .setColor(0xFFA500)
            .addFields(
                {
                    name: 'New Trigger Time',
                    value: `<t:${Math.floor(newTriggerTime.getTime() / 1000)}:F>`,
                    inline: true
                },
                {
                    name: 'Snoozed For',
                    value: timeString,
                    inline: true
                },
                {
                    name: 'Snooze Count',
                    value: `${snoozedReminder.snoozeCount}`,
                    inline: true
                }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};
