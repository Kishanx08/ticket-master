const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const database = require('../utils/database');

async function getLogChannel(guild, typeKey) {
  const guildData = await database.getGuild(guild.id);
  if (!guildData) return null;
  const perTypeId = guildData.logChannels?.[typeKey];
  const fallbackId = guildData.logChannelId;
  const targetId = perTypeId || fallbackId;
  if (!targetId) return null;
  return guild.channels.cache.get(targetId) || null;
}

module.exports = {
  name: 'guildLoggers',
  once: false,
  async execute(client) {
    const send = async (guild, embed, categoryKey) => {
      const guildData = await database.getGuild(guild.id);
      if (!guildData?.logs?.[categoryKey]) return;
      const logChannel = await getLogChannel(guild, categoryKey);
      if (!logChannel) return;
      await logChannel.send({ embeds: [embed] });
    };

    client.on(Events.GuildMemberAdd, async (member) => {
      const embed = new EmbedBuilder()
        .setTitle('Member Joined')
        .setDescription(`${member.user.tag} (${member.id}) joined the server.`)
        .setColor(0x00FF00)
        .setTimestamp();
      await send(member.guild, embed, 'members');
    });

    client.on(Events.GuildMemberRemove, async (member) => {
      const embed = new EmbedBuilder()
        .setTitle('Member Left')
        .setDescription(`${member.user.tag} (${member.id}) left the server.`)
        .setColor(0xFF0000)
        .setTimestamp();
      await send(member.guild, embed, 'members');
    });

    client.on(Events.ChannelCreate, async (channel) => {
      if (!channel.guild) return;
      const embed = new EmbedBuilder()
        .setTitle('Channel Created')
        .setDescription(`${channel} (${channel.id})`)
        .setColor(0x00BFFF)
        .setTimestamp();
      await send(channel.guild, embed, 'channels');
    });

    client.on(Events.ChannelDelete, async (channel) => {
      if (!channel.guild) return;
      const embed = new EmbedBuilder()
        .setTitle('Channel Deleted')
        .setDescription(`${channel.name || 'Unknown'} (${channel.id})`)
        .setColor(0x1E90FF)
        .setTimestamp();
      await send(channel.guild, embed, 'channels');
    });

    client.on(Events.GuildRoleCreate, async (role) => {
      const embed = new EmbedBuilder()
        .setTitle('Role Created')
        .setDescription(`${role.name} (${role.id})`)
        .setColor(0x8A2BE2)
        .setTimestamp();
      await send(role.guild, embed, 'roles');
    });

    client.on(Events.GuildRoleDelete, async (role) => {
      const embed = new EmbedBuilder()
        .setTitle('Role Deleted')
        .setDescription(`${role.name} (${role.id})`)
        .setColor(0x9932CC)
        .setTimestamp();
      await send(role.guild, embed, 'roles');
    });
  }
};

