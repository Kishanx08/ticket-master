const { Events, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

const PREFIX = '$';

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      if (!message.guild || message.author.bot) return;
      if (!message.content.startsWith(PREFIX)) return;

      const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const commandName = args.shift()?.toLowerCase();

      if (commandName === 'superadmin') {
        // permission: only administrators can toggle
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return void message.reply('❌ You need Administrator permission to use this.');
        }

        const target = message.mentions.users.first();
        if (!target) {
          return void message.reply('Usage: $superadmin @user');
        }

        const updated = await database.toggleSuperAdmin(target.id);
        if (!updated) {
          return void message.reply('❌ Failed to toggle super admin for that user.');
        }
        return void message.reply(`✅ ${target.tag} is now ${updated.isSuperAdmin ? 'a Super Admin' : 'no longer a Super Admin'}.`);
      }
    } catch (err) {
      console.error('messageCreate error:', err);
    }
  },
};

