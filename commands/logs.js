const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configure logging')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc => sc
      .setName('channel')
      .setDescription('Set the log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)))
    .addSubcommand(sc => sc
      .setName('toggle')
      .setDescription('Toggle a log category on/off')
      .addStringOption(o => o.setName('category').setDescription('Category to toggle').setRequired(true)
        .addChoices(
          { name: 'message', value: 'message' },
          { name: 'voice', value: 'voice' },
          { name: 'roles', value: 'roles' },
          { name: 'channels', value: 'channels' },
          { name: 'members', value: 'members' },
        ))),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const guildId = interaction.guild.id;
    let guildData = await database.getGuild(guildId);
    if (!guildData) {
      // initialize basic guild record
      guildData = await database.saveGuild({ _id: guildId, name: interaction.guild.name });
    }

    if (interaction.options.getSubcommand() === 'channel') {
      const channel = interaction.options.getChannel('channel');
      guildData.logChannelId = channel.id;
      await database.saveGuild(guildData.toObject ? guildData.toObject() : guildData);
      return interaction.reply({ content: `✅ Log channel set to ${channel}.`, ephemeral: true });
    }

    if (interaction.options.getSubcommand() === 'toggle') {
      const category = interaction.options.getString('category');
      const current = guildData.logs?.[category] ?? true;
      const next = !current;
      guildData.logs = { ...(guildData.logs || {}), [category]: next };
      await database.saveGuild(guildData.toObject ? guildData.toObject() : guildData);
      return interaction.reply({ content: `✅ ${category} logs ${next ? 'enabled' : 'disabled'}.`, ephemeral: true });
    }
  },
};

