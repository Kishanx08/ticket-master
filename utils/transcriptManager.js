const fs = require('fs').promises;
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

class TranscriptManager {
    constructor() {
        this.transcriptsDir = path.join(__dirname, '..', 'data', 'transcripts');
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.transcriptsDir, { recursive: true });
        } catch (error) {
            console.error('Error creating transcripts directory:', error);
        }
    }

    async generateTranscript(channel, ticket) {
        try {
            // Fetch all messages from the channel
            const messages = [];
            let lastMessageId;

            while (true) {
                const options = { limit: 100 };
                if (lastMessageId) {
                    options.before = lastMessageId;
                }

                const fetchedMessages = await channel.messages.fetch(options);
                if (fetchedMessages.size === 0) break;

                messages.push(...fetchedMessages.values());
                lastMessageId = fetchedMessages.last().id;
            }

            // Sort messages by creation time (oldest first)
            messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            // Generate transcript content
            const transcriptContent = this.formatTranscript(messages, ticket, channel);

            // Save transcript to file
            const filename = `ticket-${ticket.id}-${Date.now()}.txt`;
            const filepath = path.join(this.transcriptsDir, filename);
            await fs.writeFile(filepath, transcriptContent, 'utf8');

            // Create attachment
            const attachment = new AttachmentBuilder(filepath, { name: filename });

            return attachment;
        } catch (error) {
            console.error('Error generating transcript:', error);
            throw error;
        }
    }

    formatTranscript(messages, ticket, channel) {
        const lines = [];
        
        // Header
        lines.push('='.repeat(80));
        lines.push(`TICKET TRANSCRIPT #${ticket.id}`);
        lines.push('='.repeat(80));
        lines.push('');
        
        // Ticket Information
        lines.push('TICKET INFORMATION:');
        lines.push(`Channel: #${channel.name}`);
        lines.push(`Ticket ID: ${ticket.id}`);
        lines.push(`Status: ${ticket.status}`);
        lines.push(`Created: ${new Date(ticket.createdAt).toLocaleString()}`);
        
        if (ticket.projectType) lines.push(`Project Type: ${ticket.projectType}`);
        if (ticket.budget) lines.push(`Budget: ${ticket.budget}`);
        if (ticket.timeline) lines.push(`Timeline: ${ticket.timeline}`);
        if (ticket.contact) lines.push(`Contact Method: ${ticket.contact}`);
        
        if (ticket.description) {
            lines.push('');
            lines.push('PROJECT DESCRIPTION:');
            lines.push(ticket.description);
        }
        
        lines.push('');
        lines.push('-'.repeat(80));
        lines.push('CONVERSATION TRANSCRIPT:');
        lines.push('-'.repeat(80));
        lines.push('');

        // Messages
        messages.forEach(message => {
            const timestamp = message.createdAt.toLocaleString();
            const author = message.author.username;
            const content = message.content || '[No text content]';
            
            lines.push(`[${timestamp}] ${author}:`);
            
            // Handle message content
            if (content) {
                lines.push(content);
            }
            
            // Handle attachments
            if (message.attachments.size > 0) {
                message.attachments.forEach(attachment => {
                    lines.push(`[ATTACHMENT: ${attachment.name} - ${attachment.url}]`);
                });
            }
            
            // Handle embeds
            if (message.embeds.length > 0) {
                message.embeds.forEach(embed => {
                    lines.push(`[EMBED: ${embed.title || 'Untitled'}]`);
                    if (embed.description) {
                        lines.push(embed.description);
                    }
                });
            }
            
            lines.push('');
        });

        // Footer
        lines.push('-'.repeat(80));
        lines.push(`Transcript generated on: ${new Date().toLocaleString()}`);
        lines.push(`Total messages: ${messages.length}`);
        lines.push('='.repeat(80));

        return lines.join('\n');
    }

    async archiveTicket(channel, ticket) {
        try {
            // Generate transcript before archiving
            const transcript = await this.generateTranscript(channel, ticket);
            
            // Create archive category if it doesn't exist
            const config = require('../config.json');
            let archiveCategory = channel.guild.channels.cache.find(
                c => c.name === config.defaultSettings.archiveCategoryName && 
                c.type === 4 // GuildCategory
            );
            
            if (!archiveCategory) {
                archiveCategory = await channel.guild.channels.create({
                    name: config.defaultSettings.archiveCategoryName,
                    type: 4, // GuildCategory
                    permissionOverwrites: [
                        {
                            id: channel.guild.roles.everyone.id,
                            deny: ['ViewChannel'],
                        },
                    ]
                });
            }

            // Move channel to archive category
            await channel.setParent(archiveCategory.id);
            
            // Rename channel to indicate it's archived
            const newName = `archived-${channel.name}`;
            await channel.setName(newName);
            
            // Send archive notification
            const archiveEmbed = {
                title: '📁 Ticket Archived',
                description: 'This ticket has been archived. The conversation transcript has been generated.',
                color: 0x888888,
                timestamp: new Date().toISOString()
            };
            
            await channel.send({ embeds: [archiveEmbed] });
            
            return transcript;
        } catch (error) {
            console.error('Error archiving ticket:', error);
            throw error;
        }
    }
}

module.exports = new TranscriptManager();