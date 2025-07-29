const { SlashCommandBuilder } = require('discord.js');
const { removeLicense } = require('../utils/mariadb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_whitelist')
    .setDescription('Remove a license ID from the whitelist')
    .addStringOption(option =>
      option.setName('license_id')
        .setDescription('The license identifier to remove from whitelist')
        .setRequired(true)
    ),
  async execute(interaction) {
    const licenseId = interaction.options.getString('license_id');
    try {
      const result = await removeLicense(licenseId);
      if (result.affectedRows > 0) {
        await interaction.reply({ content: `✅ License ID \
\`${licenseId}\` removed from whitelist.`, ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ License ID not found in whitelist.', ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `❌ Error removing license: ${err.message}`, ephemeral: true });
    }
  },
}; 