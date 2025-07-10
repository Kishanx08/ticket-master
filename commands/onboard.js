const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('onboard')
        .setDescription('Set up onboarding tagging for new members')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to tag new members in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Custom message (use {user} for the new member)')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('How many seconds before the tag message is deleted (default 3)')
                .setMinValue(1)
                .setMaxValue(60)
                .setRequired(false)
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const seconds = interaction.options.getInteger('seconds') || 3;
        const guildId = interaction.guild.id;
        let guildData = await database.getGuild(guildId);
        if (!guildData) {
            guildData = { _id: guildId, name: interaction.guild.name };
        }
        guildData.onboardConfig = { channelId: channel.id, message, seconds };
        await database.saveGuild(guildData);
        await interaction.reply({
            content: `✅ Onboarding set! New members will be tagged in <#${channel.id}> with your custom message and the message will delete after ${seconds} seconds.`,
            ephemeral: true
        });
    }
}; 