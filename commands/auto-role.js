const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-role')
        .setDescription('Set a role to be automatically assigned to all current and future members')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to auto-assign')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Check admin permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        if (!role) {
            return interaction.reply({
                content: '❌ Invalid role selected.',
                ephemeral: true
            });
        }

        // Save to MongoDB
        const guildId = interaction.guild.id;
        let guildData = await database.getGuild(guildId);
        if (!guildData) {
            guildData = { _id: guildId, name: interaction.guild.name };
        }
        guildData.autoRoleId = role.id;
        await database.saveGuild(guildData);

        // Assign role to all current members
        const guild = interaction.guild;
        let assignedCount = 0;
        await guild.members.fetch(); // Fetch all members
        const promises = guild.members.cache.filter(m => !m.user.bot && !m.roles.cache.has(role.id)).map(async member => {
            try {
                await member.roles.add(role, 'Auto-role set by admin');
                assignedCount++;
            } catch (e) {}
        });
        await Promise.all(promises);

        await interaction.reply({
            content: `✅ Auto-role set to <@&${role.id}>. Assigned to ${assignedCount} existing members. New members will also get this role automatically.`,
            ephemeral: true
        });
    }
}; 