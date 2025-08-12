const { MessageAttachment } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const fetch = require('node-fetch');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

class TranscriptService {
  constructor(client) {
    this.client = client;
    this.transcriptsDir = path.join(process.cwd(), 'transcripts');
    this.ensureTranscriptsDir();
  }

  async ensureTranscriptsDir() {
    if (!(await exists(this.transcriptsDir))) {
      await mkdir(this.transcriptsDir, { recursive: true });
    }
  }

  async generateTranscript(ticket, messages) {
    try {
      const guild = this.client.guilds.cache.get(ticket.guildId);
      const channel = guild?.channels.cache.get(ticket.channelId);
      
      if (!guild || !channel) {
        throw new Error('Guild or channel not found');
      }

      const fileName = `transcript-${ticket.ticketId}-${Date.now()}.html`;
      const filePath = path.join(this.transcriptsDir, fileName);
      
      // Generate HTML content
      const html = await this.generateHTML(ticket, messages, guild, channel);
      
      // Write to file
      await writeFile(filePath, html);
      
      // Create Discord attachment
      const attachment = new MessageAttachment(filePath, fileName);
      
      return {
        file: attachment,
        path: filePath,
        fileName
      };
    } catch (error) {
      console.error('Error generating transcript:', error);
      throw error;
    }
  }

  async generateHTML(ticket, messages, guild, channel) {
    // Load HTML template
    const templatePath = path.join(__dirname, '../../templates/transcript.html');
    let html = await readFile(templatePath, 'utf8');
    
    // Prepare ticket data
    const ticketData = {
      id: ticket.ticketId,
      title: this.escapeHtml(ticket.title),
      description: this.escapeHtml(ticket.description || 'No description'),
      status: this.formatStatus(ticket.status),
      priority: this.formatPriority(ticket.priority),
      category: this.escapeHtml(ticket.category),
      createdAt: this.formatDate(ticket.createdAt),
      closedAt: ticket.closedAt ? this.formatDate(ticket.closedAt) : 'N/A',
      creator: {
        id: ticket.creator.id,
        username: this.escapeHtml(ticket.creator.username),
        discriminator: ticket.creator.discriminator
      },
      guild: {
        name: this.escapeHtml(guild?.name || 'Unknown Guild'),
        icon: guild?.iconURL({ format: 'png', dynamic: true }) || ''
      },
      channel: {
        name: this.escapeHtml(channel?.name || 'unknown-channel')
      },
      messages: messages.map(msg => this.formatMessage(msg))
    };

    // Replace placeholders in template
    html = html.replace(/\$\{([^}]+)\}/g, (match, key) => {
      const keys = key.split('.');
      let value = ticketData;
      
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) return '';
      }
      
      return value !== undefined ? value : match;
    });

    return html;
  }

  formatMessage(message) {
    return {
      id: message.messageId,
      content: this.formatMessageContent(message.content || ''),
      author: {
        id: message.author.id,
        username: this.escapeHtml(message.author.username || 'Unknown'),
        discriminator: message.author.discriminator || '0000',
        avatar: message.author.avatar || null,
        bot: message.author.bot || false
      },
      timestamp: this.formatDate(message.createdAt),
      attachments: (message.attachments || []).map(attach => ({
        name: this.escapeHtml(attach.name || 'file'),
        url: attach.url,
        type: attach.contentType || 'application/octet-stream',
        size: this.formatFileSize(attach.size || 0)
      })),
      embeds: (message.embeds || []).map(embed => ({
        title: this.escapeHtml(embed.title || ''),
        description: this.formatMessageContent(embed.description || ''),
        url: embed.url || '',
        color: embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : null,
        fields: (embed.fields || []).map(field => ({
          name: this.escapeHtml(field.name || ''),
          value: this.formatMessageContent(field.value || ''),
          inline: field.inline || false
 })),
        timestamp: embed.timestamp ? this.formatDate(new Date(embed.timestamp)) : null,
        thumbnail: embed.thumbnail ? { url: embed.thumbnail.url } : null,
        image: embed.image ? { url: embed.image.url } : null,
        footer: embed.footer ? {
          text: this.escapeHtml(embed.footer.text || ''),
          icon_url: embed.footer.iconURL || ''
        } : null,
        author: embed.author ? {
          name: this.escapeHtml(embed.author.name || ''),
          url: embed.author.url || '',
          icon_url: embed.author.iconURL || ''
        } : null
      }))
    };
  }

  formatMessageContent(content) {
    if (!content) return '';
    
    // Basic Discord markdown to HTML conversion
    return this.escapeHtml(content)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/__(.*?)__/g, '<u>$1</u>') // Underline
      .replace(/~~(.*?)~~/g, '<s>$1</s>') // Strikethrough
      .replace(/`{3}([^\n]*)([\s\S]*?)`{3}/g, '<pre><code class="block" data-lang="$1">$2</code></pre>') // Code blocks
      .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
      .replace(/\n/g, '<br>'); // New lines
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatDate(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  formatStatus(status) {
    const statusMap = {
      open: '🟢 Open',
      in_progress: '🟠 In Progress',
      awaiting_client: '🟡 Awaiting Client',
      resolved: '✅ Resolved',
      closed: '🔒 Closed',
      on_hold: '⏸️ On Hold'
    };
    
    return statusMap[status] || status;
  }

  formatPriority(priority) {
    const priorityMap = {
      low: '⬇️ Low',
      medium: '➡️ Medium',
      high: '⬆️ High',
      urgent: '🚨 Urgent'
    };
    
    return priorityMap[priority] || priority;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async cleanupFile(filePath) {
    try {
      if (await exists(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}

module.exports = TranscriptService;
