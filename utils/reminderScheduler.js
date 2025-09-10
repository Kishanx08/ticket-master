const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('./database');

class ReminderScheduler {
    constructor(client) {
        this.client = client;
        this.interval = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        // Check for due reminders every 30 seconds
        this.interval = setInterval(() => {
            this.checkAndProcessReminders();
        }, 30000);

        console.log('Reminder scheduler started');
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('Reminder scheduler stopped');
    }

    async checkAndProcessReminders() {
        try {
            const dueReminders = await database.getActiveReminders();
            
            for (const reminder of dueReminders) {
                await this.processReminder(reminder);
            }
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    }

    async processReminder(reminder) {
        try {
            // Get the user and guild
            const user = await this.client.users.fetch(reminder.userId);
            const guild = await this.client.guilds.fetch(reminder.guildId);
            const channel = await guild.channels.fetch(reminder.channelId);

            if (!user || !guild || !channel) {
                console.log(`Could not process reminder ${reminder._id} - missing user/guild/channel`);
                await database.markReminderCompleted(reminder._id);
                return;
            }

            // Create the reminder embed
            const embed = this.createReminderEmbed(reminder, user);
            const buttons = this.createReminderButtons(reminder);

            // Try to send DM first
            let sentSuccessfully = false;
            try {
                await user.send({
                    content: `⏰ **Reminder**`,
                    embeds: [embed],
                    components: [buttons]
                });
                sentSuccessfully = true;
            } catch (dmError) {
                console.log(`Could not send DM to user ${user.id}:`, dmError.message);
            }

            // If DM failed, send to original channel
            if (!sentSuccessfully) {
                try {
                    await channel.send({
                        content: `⏰ **Reminder for ${user}**`,
                        embeds: [embed],
                        components: [buttons]
                    });
                } catch (channelError) {
                    console.log(`Could not send reminder to channel ${channel.id}:`, channelError.message);
                    // Try system channel as last resort
                    try {
                        const systemChannel = guild.systemChannel;
                        if (systemChannel) {
                            await systemChannel.send({
                                content: `⏰ **Reminder for ${user}**`,
                                embeds: [embed],
                                components: [buttons]
                            });
                        }
                    } catch (systemError) {
                        console.log(`Could not send reminder to system channel:`, systemError.message);
                    }
                }
            }

            // Handle repeating reminders
            if (reminder.isRepeating) {
                await this.handleRepeatingReminder(reminder);
            } else {
                // Mark as completed for non-repeating reminders
                await database.markReminderCompleted(reminder._id);
            }

        } catch (error) {
            console.error(`Error processing reminder ${reminder._id}:`, error);
        }
    }

    createReminderEmbed(reminder, user) {
        const embed = new EmbedBuilder()
            .setTitle('⏰ Reminder')
            .setDescription(reminder.message)
            .setColor(0x00FF00)
            .addFields(
                {
                    name: 'Set by',
                    value: `${user}`,
                    inline: true
                },
                {
                    name: 'Set on',
                    value: `<t:${Math.floor(new Date(reminder.createdAt).getTime() / 1000)}:R>`,
                    inline: true
                },
                {
                    name: 'Original time',
                    value: `<t:${Math.floor(new Date(reminder.triggerTime).getTime() / 1000)}:F>`,
                    inline: false
                }
            )
            .setFooter({ 
                text: `Reminder ID: ${reminder.shortId || reminder._id}`,
                iconURL: user.displayAvatarURL()
            })
            .setTimestamp();

        if (reminder.isSnoozed) {
            embed.addFields({
                name: 'Snoozed',
                value: `${reminder.snoozeCount} time(s)`,
                inline: true
            });
        }

        if (reminder.isRepeating) {
            embed.addFields({
                name: 'Repeats',
                value: reminder.repeatInterval === 'custom' 
                    ? reminder.customRepeatPattern 
                    : reminder.repeatInterval,
                inline: true
            });
        }

        return embed;
    }

    createReminderButtons(reminder) {
        // Use shortId if available, otherwise fall back to _id
        const buttonId = reminder.shortId || reminder._id;
        
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`reminder_complete_${buttonId}`)
                    .setLabel('✅ Complete')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reminder_snooze_${buttonId}`)
                    .setLabel('😴 Snooze 15m')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`reminder_snooze_1h_${buttonId}`)
                    .setLabel('😴 Snooze 1h')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`reminder_repeat_${buttonId}`)
                    .setLabel('🔄 Repeat')
                    .setStyle(ButtonStyle.Primary)
            );
    }

    async handleRepeatingReminder(reminder) {
        try {
            const now = new Date();
            let nextTriggerTime;

            switch (reminder.repeatInterval) {
                case 'daily':
                    nextTriggerTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case 'weekly':
                    nextTriggerTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    nextTriggerTime = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes());
                    break;
                case 'yearly':
                    nextTriggerTime = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
                    break;
                case 'custom':
                    // For custom patterns, we'll need to parse the pattern
                    // This is a simplified version - you might want to use a library like node-cron
                    nextTriggerTime = this.parseCustomRepeatPattern(reminder.customRepeatPattern, now);
                    break;
                default:
                    // If we can't determine the next time, mark as completed
                    await database.markReminderCompleted(reminder._id);
                    return;
            }

            if (nextTriggerTime && nextTriggerTime > now) {
                await database.createRepeatingReminder(reminder._id, nextTriggerTime);
            }

            // Mark current reminder as completed
            await database.markReminderCompleted(reminder._id);

        } catch (error) {
            console.error('Error handling repeating reminder:', error);
        }
    }

    parseCustomRepeatPattern(pattern, fromDate) {
        // Simple custom pattern parser
        // Examples: "every 2 days", "every 3 hours", "every monday"
        const lowerPattern = pattern.toLowerCase();
        
        if (lowerPattern.includes('every')) {
            const parts = lowerPattern.split(' ');
            const number = parseInt(parts[1]);
            const unit = parts[2];

            if (isNaN(number)) return null;

            switch (unit) {
                case 'minute':
                case 'minutes':
                    return new Date(fromDate.getTime() + number * 60 * 1000);
                case 'hour':
                case 'hours':
                    return new Date(fromDate.getTime() + number * 60 * 60 * 1000);
                case 'day':
                case 'days':
                    return new Date(fromDate.getTime() + number * 24 * 60 * 60 * 1000);
                case 'week':
                case 'weeks':
                    return new Date(fromDate.getTime() + number * 7 * 24 * 60 * 60 * 1000);
                case 'monday':
                    return this.getNextWeekday(fromDate, 1);
                case 'tuesday':
                    return this.getNextWeekday(fromDate, 2);
                case 'wednesday':
                    return this.getNextWeekday(fromDate, 3);
                case 'thursday':
                    return this.getNextWeekday(fromDate, 4);
                case 'friday':
                    return this.getNextWeekday(fromDate, 5);
                case 'saturday':
                    return this.getNextWeekday(fromDate, 6);
                case 'sunday':
                    return this.getNextWeekday(fromDate, 0);
            }
        }

        return null;
    }

    getNextWeekday(fromDate, targetDay) {
        const result = new Date(fromDate);
        const currentDay = result.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        
        if (daysUntilTarget === 0) {
            // If it's the same day, schedule for next week
            result.setDate(result.getDate() + 7);
        } else {
            result.setDate(result.getDate() + daysUntilTarget);
        }
        
        return result;
    }

    // Method to handle button interactions
    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('reminder_complete_')) {
            await this.handleCompleteReminder(interaction, customId);
        } else if (customId.startsWith('reminder_snooze_')) {
            await this.handleSnoozeReminder(interaction, customId);
        } else if (customId.startsWith('reminder_repeat_')) {
            await this.handleRepeatReminder(interaction, customId);
        }
    }

    async handleCompleteReminder(interaction, customId) {
        const reminderId = customId.replace('reminder_complete_', '');
        
        try {
            const reminder = await database.getReminder(reminderId);
            if (!reminder) {
                return interaction.reply({
                    content: '❌ Reminder not found.',
                    ephemeral: true
                });
            }

            if (reminder.userId !== interaction.user.id) {
                return interaction.reply({
                    content: '❌ You can only complete your own reminders.',
                    ephemeral: true
                });
            }

            await database.markReminderCompleted(reminderId);

            const embed = new EmbedBuilder()
                .setTitle('✅ Reminder Completed')
                .setDescription('This reminder has been marked as completed and removed.')
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error handling complete reminder:', error);
            await interaction.reply({
                content: '❌ An error occurred while completing the reminder.',
                ephemeral: true
            });
        }
    }

    async handleSnoozeReminder(interaction, customId) {
        const reminderId = customId.replace('reminder_snooze_', '').replace('_1h', '');
        const isOneHour = customId.includes('_1h');
        const snoozeMinutes = isOneHour ? 60 : 15;
        
        try {
            const reminder = await database.getReminder(reminderId);
            if (!reminder) {
                return interaction.reply({
                    content: '❌ Reminder not found.',
                    ephemeral: true
                });
            }

            if (reminder.userId !== interaction.user.id) {
                return interaction.reply({
                    content: '❌ You can only snooze your own reminders.',
                    ephemeral: true
                });
            }

            const newTriggerTime = new Date(Date.now() + snoozeMinutes * 60 * 1000);
            await database.snoozeReminder(reminderId, newTriggerTime);

            const embed = new EmbedBuilder()
                .setTitle('😴 Reminder Snoozed')
                .setDescription(`This reminder has been snoozed for ${snoozeMinutes} minutes.`)
                .setColor(0xFFA500)
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error handling snooze reminder:', error);
            await interaction.reply({
                content: '❌ An error occurred while snoozing the reminder.',
                ephemeral: true
            });
        }
    }

    async handleRepeatReminder(interaction, customId) {
        const reminderId = customId.replace('reminder_repeat_', '');
        
        try {
            const reminder = await database.getReminder(reminderId);
            if (!reminder) {
                return interaction.reply({
                    content: '❌ Reminder not found.',
                    ephemeral: true
                });
            }

            if (reminder.userId !== interaction.user.id) {
                return interaction.reply({
                    content: '❌ You can only repeat your own reminders.',
                    ephemeral: true
                });
            }

            // Create a new reminder with the same settings but new trigger time
            const now = new Date();
            let nextTriggerTime;

            if (reminder.isRepeating) {
                // Use the same repeat logic
                switch (reminder.repeatInterval) {
                    case 'daily':
                        nextTriggerTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                        break;
                    case 'weekly':
                        nextTriggerTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'monthly':
                        nextTriggerTime = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes());
                        break;
                    case 'yearly':
                        nextTriggerTime = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
                        break;
                    default:
                        nextTriggerTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
                }
            } else {
                // If not repeating, create a daily repeat
                nextTriggerTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            }

            await database.createRepeatingReminder(reminderId, nextTriggerTime);
            await database.markReminderCompleted(reminderId);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Reminder Repeated')
                .setDescription('This reminder has been repeated and will trigger again.')
                .setColor(0x0099FF)
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error handling repeat reminder:', error);
            await interaction.reply({
                content: '❌ An error occurred while repeating the reminder.',
                ephemeral: true
            });
        }
    }
}

module.exports = ReminderScheduler;
