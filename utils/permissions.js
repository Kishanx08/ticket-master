const { PermissionFlagsBits } = require('discord.js');

/**
 * Check if a user has admin permissions
 * @param {GuildMember} member - The guild member to check
 * @returns {boolean} - Whether the user has admin permissions
 */
function hasAdminPermissions(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Check if a user has manage channels permissions (for ticket management)
 * @param {GuildMember} member - The guild member to check
 * @returns {boolean} - Whether the user has manage channels permissions
 */
function hasTicketPermissions(member) {
    return member.permissions.has(PermissionFlagsBits.ManageChannels) || 
           member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Reply with an error message for insufficient permissions
 * @param {CommandInteraction} interaction - The interaction to reply to
 * @param {string} requiredPermission - The permission that is required
 */
async function replyNoPermission(interaction, requiredPermission = 'Administrator') {
    return await interaction.reply({
        content: `❌ You need **${requiredPermission}** permissions to use this command.`,
        ephemeral: true
    });
}

module.exports = {
    hasAdminPermissions,
    hasTicketPermissions,
    replyNoPermission
};