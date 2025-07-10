const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-client')
        .setDescription('Assign the client role to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to assign the client role to')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Client role to assign')
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

        const user = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');
        if (!user || !role) {
            return interaction.reply({
                content: '❌ Invalid user or role selected.',
                ephemeral: true
            });
        }
        if (user.roles.cache.has(role.id)) {
            return interaction.reply({
                content: `❌ <@${user.id}> already has the <@&${role.id}> role.`,
                ephemeral: true
            });
        }
        try {
            await user.roles.add(role, 'Added as client by admin');
            await interaction.reply({
                content: `✅ <@${user.id}> has been given the <@&${role.id}> role.`,
                ephemeral: true
            });
        } catch (e) {
            await interaction.reply({
                content: '❌ Failed to assign the role. Please check my permissions and role hierarchy.',
                ephemeral: true
            });
        }
    }
}; 