const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configure logging')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc => sc
      .setName('set')
      .setDescription('Set which channel receives which type of logs')
      .addStringOption(o => o.setName('type').setDescription('Type of logs to route').setRequired(true)
        .addChoices(
          { name: 'message', value: 'message' },
          { name: 'voice', value: 'voice' },
          { name: 'roles', value: 'roles' },
          { name: 'channels', value: 'channels' },
          { name: 'members', value: 'members' },
        ))
      .addChannelOption(o => o.setName('channel').setDescription('Destination channel for logs').setRequired(true)))
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
      guildData = await database.saveGuild({ _id: guildId, name: interaction.guild.name });
    }

    if (interaction.options.getSubcommand() === 'set') {
      const type = interaction.options.getString('type');
      const channel = interaction.options.getChannel('channel');
      const logChannels = { ...(guildData.logChannels || {}) };
      logChannels[type] = channel.id;
      guildData.logChannels = logChannels;
      await database.saveGuild(guildData.toObject ? guildData.toObject() : guildData);
      return interaction.reply({ content: `✅ ${type} logs will be sent to ${channel}.`, ephemeral: true });
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

