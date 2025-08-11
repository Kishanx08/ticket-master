const { Events, REST, Routes } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Register slash commands
        const commands = [];
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST().setToken(process.env.DISCORD_TOKEN || 'your_bot_token_here');

        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            // Register commands globally
            const data = await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands },
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error('Error registering slash commands:', error);
        }

        // Set bot status
        client.user.setActivity('Managing tickets | /ticket setup', { type: 'WATCHING' });

        // Auto-role assignment for all members if autoRoleId is set in MongoDB
        const database = require('../utils/database');
        for (const [guildId, guild] of client.guilds.cache) {
            let guildData = await database.getGuild(guildId);
            if (guildData && guildData.autoRoleId) {
                await guild.members.fetch();
                const role = guild.roles.cache.get(guildData.autoRoleId);
                if (role) {
                    const promises = guild.members.cache.filter(m => !m.user.bot && !m.roles.cache.has(role.id)).map(async member => {
                        try {
                            await member.roles.add(role, 'Auto-role sync on bot ready');
                        } catch (e) {}
                    });
                    await Promise.all(promises);
                }
            }
        }
        // Wire up logger listeners (message, guild, voice)
        try {
            const messageLoggers = require('./messageLoggers');
            const guildLoggers = require('./guildLoggers');
            const voiceLoggers = require('./voiceLoggers');
            await messageLoggers.execute(client);
            await guildLoggers.execute(client);
            await voiceLoggers.execute(client);
        } catch (e) {}
    },
};
