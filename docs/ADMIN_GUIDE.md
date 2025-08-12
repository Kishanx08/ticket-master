# Discord Ticket System - Administrator Guide

This guide provides comprehensive information for server administrators on how to set up, configure, and manage the Discord Ticket System.

## Table of Contents
- [Initial Setup](#initial-setup)
- [Configuration Options](#configuration-options)
- [Managing Tickets](#managing-tickets)
- [Moderation](#moderation)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Initial Setup

### 1. Invite the Bot
1. Create a bot application at the [Discord Developer Portal](https://discord.com/developers/applications)
2. Invite the bot to your server with these permissions:
   - `View Channels`
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
   - `Manage Channels`
   - `Manage Roles`
   - `Manage Messages`
   - `Add Reactions`

### 2. Basic Configuration
1. Set up the ticket category:
   ```
   /ticket-config settings setting:category channel:category-id
   ```
2. Set up the log channel:
   ```
   /ticket-config settings setting:logChannel channel:log-channel-id
   ```
3. Add staff roles:
   ```
   /ticket-config settings setting:staffRole role:@Staff
   ```

## Configuration Options

### Ticket Categories
Create custom ticket categories with specific staff assignments:
```
/ticket-config categories add name:"Billing" description:"Payment and subscription issues" staff-role:@Billing
```

### System Settings
- **Max Tickets Per User**: Limit how many open tickets a user can have
- **Auto-Close Inactive Tickets**: Automatically close tickets after a period of inactivity
- **Save Transcripts**: Enable/disable saving of ticket transcripts
- **Notification Settings**: Configure where and how notifications are sent

### Permissions
- **Administrators**: Full access to all ticket commands and configuration
- **Staff Roles**: Can manage tickets and view all tickets
- **Users**: Can create and manage their own tickets

## Managing Tickets

### Viewing Tickets
List all open tickets:
```
/ticket list status:open
```

### Claiming Tickets
Staff can claim tickets to take ownership:
```
/ticket claim
```

### Closing Tickets
Close a ticket with an optional reason:
```
/ticket close reason:"Issue resolved"
```

### Reopening Tickets
Reopen a closed ticket:
```
/ticket reopen
```

## Moderation

### Ticket Transcripts
View a transcript of any ticket:
```
/ticket transcript ticket:123
```

### Bulk Actions
Close multiple tickets at once:
```
/ticket bulk-close category:support status:resolved
```

### User Blacklist
Prevent users from creating tickets:
```
/ticket blacklist add @user
```

## Troubleshooting

### Common Issues

#### Bot Missing Permissions
- Ensure the bot has all required permissions in the server settings
- Check channel-specific permission overrides

#### Tickets Not Creating
- Verify the bot can create channels in the specified category
- Check if the user has reached their ticket limit

#### Notifications Not Sending
- Ensure the log channel is set up correctly
- Check the bot's permissions in the log channel

## Best Practices

### Staff Training
- Train staff on proper ticket handling procedures
- Establish response time expectations
- Create templates for common responses

### Ticket Organization
- Use clear, descriptive ticket titles
- Assign appropriate categories and priorities
- Keep conversations on-topic

### Performance Monitoring
- Regularly review ticket response times
- Monitor ticket resolution rates
- Gather user feedback on support quality

## Advanced Configuration

### Custom Embeds
Customize the look of ticket messages:
```
/ticket-config embed set welcome
```

### Automated Responses
Set up automated responses for common questions:
```
/ticket-config auto-response add trigger:"refund" response:"Our refund policy is..."
```

### Webhook Integration
Connect the ticket system to external services:
```
/ticket-config webhook add url:"https://example.com/webhook"
```

## Support
For additional help, please contact the bot developer or refer to the [GitHub repository](https://github.com/yourusername/discord-ticket-bot).
