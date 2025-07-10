const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Send a message to a specific channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the message to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Message content to send')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('embed')
                .setDescription('Send as an embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_title')
                .setDescription('Embed title (only if embed is true)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_color')
                .setDescription('Embed color (hex code like 0x0099FF)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_footer')
                .setDescription('Embed footer text')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_thumbnail')
                .setDescription('Embed thumbnail URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_image')
                .setDescription('Embed image URL')
                .setRequired(false)),

    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const useEmbed = interaction.options.getBoolean('embed') || false;
        const embedTitle = interaction.options.getString('embed_title');
        const embedColor = interaction.options.getString('embed_color');
        const embedFooter = interaction.options.getString('embed_footer');
        const embedThumbnail = interaction.options.getString('embed_thumbnail');
        const embedImage = interaction.options.getString('embed_image');

        try {
            if (useEmbed) {
                const embed = new EmbedBuilder()
                    .setDescription(message);

                if (embedTitle) embed.setTitle(embedTitle);
                if (embedColor) embed.setColor(parseInt(embedColor, 16));
                if (embedFooter) embed.setFooter({ text: embedFooter });
                if (embedThumbnail) embed.setThumbnail(embedThumbnail);
                if (embedImage) embed.setImage(embedImage);

                embed.setTimestamp();

                await channel.send({ embeds: [embed] });
            } else {
                await channel.send(message);
            }

            await interaction.reply({
                content: `✅ Message sent successfully to ${channel}!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error sending message:', error);
            await interaction.reply({
                content: '❌ Failed to send message. Please check the channel permissions and try again.',
                ephemeral: true
            });
        }
    }
};