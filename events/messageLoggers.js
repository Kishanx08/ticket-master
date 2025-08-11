const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const database = require('../utils/database');

async function getLogChannel(guild) {
  const guildData = await database.getGuild(guild.id);
  if (!guildData || !guildData.logChannelId) return null;
  return guild.channels.cache.get(guildData.logChannelId) || null;
}

module.exports = {
  name: 'messageLoggers',
  once: false,
  async execute(client) {
    client.on(Events.MessageDelete, async (message) => {
      try {
        if (!message.guild || message.author?.bot) return;
        const guildData = await database.getGuild(message.guild.id);
        if (!guildData?.logs?.message) return;
        const logChannel = await getLogChannel(message.guild);
        if (!logChannel) return;
        const embed = new EmbedBuilder()
          .setTitle('Message Deleted')
          .setDescription(message.content ? message.content.substring(0, 2048) : '(no content)')
          .addFields(
            { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: false },
            { name: 'Channel', value: `${message.channel}`, inline: false },
          )
          .setColor(0xFF0000)
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      } catch (e) {}
    });

    client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
      try {
        if (!newMsg.guild || newMsg.author?.bot) return;
        const guildData = await database.getGuild(newMsg.guild.id);
        if (!guildData?.logs?.message) return;
        const logChannel = await getLogChannel(newMsg.guild);
        if (!logChannel) return;
        const before = oldMsg?.content || '(unknown)';
        const after = newMsg?.content || '(unknown)';
        if (before === after) return;
        const embed = new EmbedBuilder()
          .setTitle('Message Edited')
          .addFields(
            { name: 'Author', value: `${newMsg.author.tag} (${newMsg.author.id})`, inline: false },
            { name: 'Channel', value: `${newMsg.channel}`, inline: false },
            { name: 'Before', value: before.substring(0, 1024), inline: false },
            { name: 'After', value: after.substring(0, 1024), inline: false },
          )
          .setColor(0xFFA500)
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      } catch (e) {}
    });
  }
};

