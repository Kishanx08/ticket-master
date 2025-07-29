const { SlashCommandBuilder } = require('discord.js');
const { addLicense } = require('../utils/mariadb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_whitelist')
    .setDescription('Add a license ID to the whitelist')
    .addStringOption(option =>
      option.setName('license_id')
        .setDescription('The license identifier to whitelist')
        .setRequired(true)
    ),
  async execute(interaction) {
    const licenseId = interaction.options.getString('license_id');
    try {
      await addLicense(licenseId);
      await interaction.reply({ content: `✅ License ID \
\`${licenseId}\` added to whitelist.`, ephemeral: true });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        await interaction.reply({ content: '❌ This license ID is already whitelisted.', ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ Error adding license: ${err.message}`, ephemeral: true });
      }
    }
  },
}; 