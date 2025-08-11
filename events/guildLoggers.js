const { Events, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const audit = require('../utils/audit');

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
        .addFields({ name: 'Joined At', value: `<t:${Math.floor(Date.now()/1000)}:f>` })
        .setColor(0x00FF00)
        .setTimestamp();
      await send(member.guild, embed, 'members');
    });

    client.on(Events.GuildMemberRemove, async (member) => {
      const extra = await audit.findMemberRemoveExecutor(member.guild, member.id);
      const embed = new EmbedBuilder()
        .setTitle('Member Left')
        .setDescription(`${member.user.tag} (${member.id}) left the server.`)
        .addFields(
          { name: 'Time', value: `<t:${Math.floor(Date.now()/1000)}:f>` },
          { name: 'Reason', value: extra ? (extra.action === 'kick' ? 'Kicked' : 'Banned') : 'Left or unknown' },
          { name: 'By', value: extra?.executor ? `${extra.executor.tag} (${extra.executor.id})` : 'Unknown' }
        )
        .setColor(0xFF0000)
        .setTimestamp();
      await send(member.guild, embed, 'members');
    });

    client.on(Events.ChannelCreate, async (channel) => {
      if (!channel.guild) return;
      const executor = await audit.findChannelActionExecutor(channel.guild, audit.AuditLogEvent.ChannelCreate, channel.id);
      const embed = new EmbedBuilder()
        .setTitle('Channel Created')
        .setDescription(`${channel} (${channel.id})`)
        .addFields({ name: 'Created By', value: executor ? `<@${executor.id}> (${executor.tag})` : 'Unknown' })
        .setColor(0x00BFFF)
        .setTimestamp();
      await send(channel.guild, embed, 'channels');
    });

    client.on(Events.ChannelDelete, async (channel) => {
      if (!channel.guild) return;
      const executor = await audit.findChannelActionExecutor(channel.guild, audit.AuditLogEvent.ChannelDelete, channel.id);
      const embed = new EmbedBuilder()
        .setTitle('Channel Deleted')
        .setDescription(`${channel.name || 'Unknown'} (${channel.id})`)
        .addFields({ name: 'Deleted By', value: executor ? `<@${executor.id}> (${executor.tag})` : 'Unknown' })
        .setColor(0x1E90FF)
        .setTimestamp();
      await send(channel.guild, embed, 'channels');
    });

    client.on(Events.GuildRoleCreate, async (role) => {
      const executor = await audit.findRoleActionExecutor(role.guild, audit.AuditLogEvent.RoleCreate, role.id);
      const embed = new EmbedBuilder()
        .setTitle('Role Created')
        .setDescription(`${role.name} (${role.id})`)
        .addFields({ name: 'Created By', value: executor ? `<@${executor.id}> (${executor.tag})` : 'Unknown' })
        .setColor(0x8A2BE2)
        .setTimestamp();
      await send(role.guild, embed, 'roles');
    });

    client.on(Events.GuildRoleDelete, async (role) => {
      const executor = await audit.findRoleActionExecutor(role.guild, audit.AuditLogEvent.RoleDelete, role.id);
      const embed = new EmbedBuilder()
        .setTitle('Role Deleted')
        .setDescription(`${role.name} (${role.id})`)
        .addFields({ name: 'Deleted By', value: executor ? `<@${executor.id}> (${executor.tag})` : 'Unknown' })
        .setColor(0x9932CC)
        .setTimestamp();
      await send(role.guild, embed, 'roles');
    });

    client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
      try {
        const guild = newRole.guild;
        const executor = await audit.findRoleActionExecutor(guild, audit.AuditLogEvent.RoleUpdate, newRole.id);

        const changes = [];
        if (oldRole.name !== newRole.name) {
          changes.push({ name: 'Name', value: `"${oldRole.name}" ➜ "${newRole.name}"` });
        }

        const oldPerms = new Set(oldRole.permissions.toArray());
        const newPerms = new Set(newRole.permissions.toArray());
        const addedPerms = [...newPerms].filter(p => !oldPerms.has(p));
        const removedPerms = [...oldPerms].filter(p => !newPerms.has(p));

        if (addedPerms.length > 0) {
          changes.push({ name: 'Permissions Added', value: addedPerms.map(p => `+ ${p}`).join('\n').slice(0, 1024) });
        }
        if (removedPerms.length > 0) {
          changes.push({ name: 'Permissions Removed', value: removedPerms.map(p => `- ${p}`).join('\n').slice(0, 1024) });
        }

        if (changes.length === 0) return; // nothing notable

        const embed = new EmbedBuilder()
          .setTitle('Role Updated')
          .setDescription(`${newRole.name} (${newRole.id})`)
          .addFields(
            ...changes,
            { name: 'Updated By', value: executor ? `<@${executor.id}> (${executor.tag})` : 'Unknown' },
            { name: 'Time', value: `<t:${Math.floor(Date.now()/1000)}:f>` }
          )
          .setColor(0xFFD700)
          .setTimestamp();
        await send(guild, embed, 'roles');
      } catch (e) {}
    });

    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
      try {
        const guild = newMember.guild;
        const oldRoleIds = new Set(oldMember.roles.cache.map(r => r.id));
        const newRoleIds = new Set(newMember.roles.cache.map(r => r.id));
        const added = [...newRoleIds].filter(id => !oldRoleIds.has(id));
        const removed = [...oldRoleIds].filter(id => !newRoleIds.has(id));
        if (added.length === 0 && removed.length === 0) return;

        const executor = await audit.findMemberRoleUpdateExecutor(guild, newMember.id);

        const addedRoles = added.map(id => `<@&${id}>`).join(', ') || 'None';
        const removedRoles = removed.map(id => `<@&${id}>`).join(', ') || 'None';

        const embed = new EmbedBuilder()
          .setTitle('Member Roles Updated')
          .setDescription(`${newMember.user.tag} (${newMember.id})`)
          .addFields(
            { name: 'Roles Added', value: addedRoles },
            { name: 'Roles Removed', value: removedRoles },
            { name: 'Updated By', value: executor ? `<@${executor.id}> (${executor.tag})` : 'Unknown' },
            { name: 'Time', value: `<t:${Math.floor(Date.now()/1000)}:f>` }
          )
          .setColor(0x20B2AA)
          .setTimestamp();
        // Route to roles category as requested
        await send(guild, embed, 'roles');
      } catch (e) {}
    });
  }
};

