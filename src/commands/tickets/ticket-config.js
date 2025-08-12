const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const TicketConfig = require('../../models/TicketConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-config')
    .setDescription('Configure ticket system settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('categories')
        .setDescription('Manage ticket categories')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add Category', value: 'add' },
              { name: 'Remove Category', value: 'remove' },
              { name: 'List Categories', value: 'list' }
            )
        )
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Name of the category')
        )
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description of the category')
        )
        .addRoleOption(option =>
          option.setName('staff-role')
            .setDescription('Staff role for this category')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Configure ticket system settings')
        .addStringOption(option =>
          option.setName('setting')
            .setDescription('Setting to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Ticket Category', value: 'category' },
              { name: 'Log Channel', value: 'logChannel' },
              { name: 'Staff Role', value: 'staffRole' },
              { name: 'Max Tickets Per User', value: 'maxTickets' },
              { name: 'Ticket Auto-Close', value: 'autoClose' },
              { name: 'Ticket Transcripts', value: 'transcripts' }
            )
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to set')
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to set')
        )
        .addIntegerOption(option =>
          option.setName('number')
            .setDescription('Number value')
        )
        .addBooleanOption(option =>
          option.setName('boolean')
            .setDescription('Enable or disable the setting')
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'categories':
          await handleCategories(interaction);
          break;
        case 'settings':
          await handleSettings(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (error) {
      console.error('Error in ticket-config command:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing your request.', 
        ephemeral: true 
      });
    }
  },
};

async function handleCategories(interaction) {
  const action = interaction.options.getString('action');
  const name = interaction.options.getString('name');
  const description = interaction.options.getString('description');
  const staffRole = interaction.options.getRole('staff-role');
  
  const config = await TicketConfig.getConfig(interaction.guildId) || 
    new TicketConfig({ guildId: interaction.guildId });
  
  switch (action) {
    case 'add':
      if (!name) {
        return interaction.reply({
          content: 'Please provide a name for the category.',
          ephemeral: true
        });
      }
      
      // Generate a URL-friendly ID
      const categoryId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      
      // Check if category already exists
      if (config.categories.some(cat => cat.id === categoryId)) {
        return interaction.reply({
          content: 'A category with this name already exists.',
          ephemeral: true
        });
      }
      
      // Add the new category
      config.categories.push({
        id: categoryId,
        name: name,
        description: description || 'No description provided.',
        staffRoles: staffRole ? [staffRole.id] : []
      });
      
      await config.save();
      
      await interaction.reply({
        content: `✅ Added category "${name}" with ID "${categoryId}"`,
        ephemeral: true
      });
      break;
      
    case 'remove':
      if (!name) {
        // Show a select menu of categories to remove
        if (config.categories.length === 0) {
          return interaction.reply({
            content: 'There are no categories to remove.',
            ephemeral: true
          });
        }
        
        const row = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('remove_category')
              .setPlaceholder('Select a category to remove')
              .addOptions(
                config.categories.map(cat => ({
                  label: cat.name,
                  description: cat.description.substring(0, 50) + (cat.description.length > 50 ? '...' : ''),
                  value: cat.id
                }))
              )
          );
          
        await interaction.reply({
          content: 'Select a category to remove:',
          components: [row],
          ephemeral: true
        });
        
      } else {
        // Remove category by name
        const categoryId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const index = config.categories.findIndex(cat => cat.id === categoryId);
        
        if (index === -1) {
          return interaction.reply({
            content: 'Category not found.',
            ephemeral: true
          });
        }
        
        const removed = config.categories.splice(index, 1)[0];
        await config.save();
        
        await interaction.reply({
          content: `✅ Removed category "${removed.name}"`,
          ephemeral: true
        });
      }
      break;
      
    case 'list':
      if (config.categories.length === 0) {
        return interaction.reply({
          content: 'There are no categories configured.',
          ephemeral: true
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('Ticket Categories')
        .setColor('#5865F2')
        .setDescription('Here are all configured ticket categories:');
        
      for (const category of config.categories) {
        const staffRoles = category.staffRoles?.length > 0
          ? category.staffRoles.map(id => `<@&${id}>`).join(', ')
          : 'None set';
          
        embed.addFields({
          name: category.name,
          value: `**ID:** \`${category.id}\`
                  **Description:** ${category.description || 'No description'}
                  **Staff Roles:** ${staffRoles}`,
          inline: false
        });
      }
      
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      break;
  }
}

async function handleSettings(interaction) {
  const setting = interaction.options.getString('setting');
  const channel = interaction.options.getChannel('channel');
  const role = interaction.options.getRole('role');
  const number = interaction.options.getInteger('number');
  const bool = interaction.options.getBoolean('boolean');
  
  const config = await TicketConfig.getConfig(interaction.guildId) || 
    new TicketConfig({ guildId: interaction.guildId });
  
  switch (setting) {
    case 'category':
      if (!channel || channel.type !== 4) { // 4 = GUILD_CATEGORY
        return interaction.reply({
          content: 'Please provide a valid category channel.',
          ephemeral: true
        });
      }
      
      config.ticketCategory = channel.id;
      await config.save();
      
      await interaction.reply({
        content: `✅ Ticket category set to ${channel}`,
        ephemeral: true
      });
      break;
      
    case 'logChannel':
      if (!channel || channel.type !== 0) { // 0 = GUILD_TEXT
        return interaction.reply({
          content: 'Please provide a valid text channel.',
          ephemeral: true
        });
      }
      
      config.logChannel = channel.id;
      await config.save();
      
      await interaction.reply({
        content: `✅ Log channel set to ${channel}`,
        ephemeral: true
      });
      break;
      
    case 'staffRole':
      if (!role) {
        return interaction.reply({
          content: 'Please provide a valid role.',
          ephemeral: true
        });
      }
      
      // Add or remove from staff roles
      const roleIndex = config.staffRoles.indexOf(role.id);
      if (roleIndex === -1) {
        config.staffRoles.push(role.id);
        await config.save();
        await interaction.reply({
          content: `✅ Added ${role} to staff roles`,
          ephemeral: true
        });
      } else {
        config.staffRoles.splice(roleIndex, 1);
        await config.save();
        await interaction.reply({
          content: `✅ Removed ${role} from staff roles`,
          ephemeral: true
        });
      }
      break;
      
    case 'maxTickets':
      if (number === null || number < 1 || number > 10) {
        return interaction.reply({
          content: 'Please provide a number between 1 and 10.',
          ephemeral: true
        });
      }
      
      config.maxTicketsPerUser = number;
      await config.save();
      
      await interaction.reply({
        content: `✅ Maximum tickets per user set to ${number}`,
        ephemeral: true
      });
      break;
      
    case 'autoClose':
      if (bool === null) {
        return interaction.reply({
          content: 'Please specify true or false.',
          ephemeral: true
        });
      }
      
      config.autoCloseInactiveTickets = bool;
      if (bool && !number) {
        config.inactiveTicketDays = 7; // Default to 7 days
      }
      await config.save();
      
      await interaction.reply({
        content: `✅ Auto-close ${bool ? 'enabled' : 'disabled'} for inactive tickets`,
        ephemeral: true
      });
      break;
      
    case 'transcripts':
      if (bool === null) {
        return interaction.reply({
          content: 'Please specify true or false.',
          ephemeral: true
        });
      }
      
      config.saveTranscripts = bool;
      await config.save();
      
      await interaction.reply({
        content: `✅ Transcript saving ${bool ? 'enabled' : 'disabled'}`,
        ephemeral: true
      });
      break;
  }
}
