const { AuditLogEvent } = require('discord.js');

function isRecent(entry, maxMs = 10000) {
  const created = entry.createdTimestamp || (entry.createdAt ? entry.createdAt.getTime() : 0);
  return Date.now() - created <= maxMs;
}

async function findMessageDeleteExecutor(guild, targetAuthorId, channelId) {
  try {
    if (!guild.members.me.permissions.has('ViewAuditLog')) return null;
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 5 });
    const entry = logs.entries.find(([, e]) => {
      const tId = e.target?.id || e.targetId;
      const extraChannelId = e.extra?.channel?.id || e.extra?.channelId;
      return isRecent(e) && tId === targetAuthorId && (!channelId || extraChannelId === channelId);
    });
    const found = entry ? entry[1] : null;
    return found ? found.executor : null;
  } catch (e) {
    return null;
  }
}

async function findChannelActionExecutor(guild, type, channelId) {
  try {
    if (!guild.members.me.permissions.has('ViewAuditLog')) return null;
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find(([, e]) => {
      const tId = e.target?.id || e.targetId;
      return isRecent(e) && tId === channelId;
    });
    const found = entry ? entry[1] : null;
    return found ? found.executor : null;
  } catch (e) {
    return null;
  }
}

async function findRoleActionExecutor(guild, type, roleId) {
  try {
    if (!guild.members.me.permissions.has('ViewAuditLog')) return null;
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find(([, e]) => {
      const tId = e.target?.id || e.targetId;
      return isRecent(e) && tId === roleId;
    });
    const found = entry ? entry[1] : null;
    return found ? found.executor : null;
  } catch (e) {
    return null;
  }
}

async function findMemberRemoveExecutor(guild, memberId) {
  try {
    if (!guild.members.me.permissions.has('ViewAuditLog')) return null;
    // Check kick
    const kickLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 });
    const kickEntry = kickLogs.entries.find(([, e]) => {
      const tId = e.target?.id || e.targetId;
      return isRecent(e) && tId === memberId;
    });
    if (kickEntry) return { action: 'kick', executor: kickEntry[1].executor };

    // Check ban
    const banLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 });
    const banEntry = banLogs.entries.find(([, e]) => {
      const tId = e.target?.id || e.targetId;
      return isRecent(e) && tId === memberId;
    });
    if (banEntry) return { action: 'ban', executor: banEntry[1].executor };

    return null;
  } catch (e) {
    return null;
  }
}

async function findMemberRoleUpdateExecutor(guild, memberId) {
  try {
    if (!guild.members.me.permissions.has('ViewAuditLog')) return null;
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 5 });
    const entry = logs.entries.find(([, e]) => {
      const tId = e.target?.id || e.targetId;
      return isRecent(e) && tId === memberId;
    });
    const found = entry ? entry[1] : null;
    return found ? found.executor : null;
  } catch (e) {
    return null;
  }
}

async function findMemberUpdateExecutor(guild, memberId) {
  try {
    if (!guild.members.me.permissions.has('ViewAuditLog')) return null;
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });
    const entry = logs.entries.find(([, e]) => {
      const tId = e.target?.id || e.targetId;
      return isRecent(e) && tId === memberId;
    });
    const found = entry ? entry[1] : null;
    return found ? found.executor : null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  findMessageDeleteExecutor,
  findChannelActionExecutor,
  findRoleActionExecutor,
  findMemberRemoveExecutor,
  findMemberRoleUpdateExecutor,
  findMemberUpdateExecutor,
  AuditLogEvent,
};

