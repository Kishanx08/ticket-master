const { Events, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

async function getLogChannel(guild) {
  const guildData = await database.getGuild(guild.id);
  if (!guildData || !guildData.logChannelId) return null;
  return guild.channels.cache.get(guildData.logChannelId) || null;
}

module.exports = {
  name: 'voiceLoggers',
  once: false,
  async execute(client) {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
      try {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;
        const guildData = await database.getGuild(guild.id);
        if (!guildData?.logs?.voice) return;
        const logChannel = await getLogChannel(guild);
        if (!logChannel) return;
        const member = newState.member || oldState.member;

        let action = null;
        let channelText = '';

        if (!oldState.channelId && newState.channelId) {
          action = 'Joined VC';
          channelText = `${newState.channel}`;
        } else if (oldState.channelId && !newState.channelId) {
          action = 'Left VC';
          channelText = `${oldState.channel}`;
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
          action = 'Switched VC';
          channelText = `${oldState.channel} ➜ ${newState.channel}`;
        }

        if (!action) return;

        const embed = new EmbedBuilder()
          .setTitle(action)
          .setDescription(`${member.user.tag} (${member.id})`)
          .addFields({ name: 'Channel', value: channelText })
          .setColor(0x00CED1)
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      } catch (e) {}
    });
  }
};

