# Discord Ticket System - Developer Documentation

This document provides detailed information for developers working with the Discord Ticket System codebase.

## Table of Contents
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Extending the System](#extending-the-system)
- [Testing](#testing)
- [Contributing](#contributing)

## Project Structure

```
ticket-master/
├── src/
│   ├── commands/           # Slash command handlers
│   │   └── tickets/        # Ticket-related commands
│   ├── events/             # Discord event handlers
│   ├── models/             # Database models
│   ├── services/           # Business logic services
│   └── utils/              # Utility functions
├── docs/                   # Documentation
├── templates/              # HTML/email templates
└── tests/                  # Test files
```

## Core Components

### 1. TicketService
Handles all ticket-related business logic.

**Key Methods:**
- `createTicket(ticketData)`: Creates a new ticket
- `closeTicket(ticketId, userId, reason)`: Closes a ticket
- `addParticipant(ticketId, user)`: Adds a user to a ticket
- `getTicketByChannel(channelId)`: Finds a ticket by its channel ID

### 2. DiscordService
Manages Discord-specific functionality.

**Key Methods:**
- `createTicketChannel(guild, name, category, creator, staffRoles)`: Creates a ticket channel
- `updateChannelPermissions(channel, user, permissions)`: Updates channel permissions
- `sendTicketMessage(channel, ticket, config)`: Sends a ticket message

### 3. NotificationService
Handles all system notifications.

**Key Methods:**
- `notifyTicketCreated(ticket)`: Sends notifications for new tickets
- `notifyTicketClosed(ticket, closer, reason)`: Notifies about ticket closure
- `notifyStaff(ticket, message)`: Sends a notification to staff

### 4. TranscriptService
Manages ticket transcripts.

**Key Methods:**
- `generateTranscript(ticket, messages)`: Generates an HTML transcript
- `saveTranscript(ticket, messages)`: Saves transcript to storage
- `getTranscript(ticketId)`: Retrieves a saved transcript

## Database Schema

### Ticket
```javascript
{
  ticketId: Number,         // Auto-incremented ticket number
  guildId: String,          // Discord guild ID
  channelId: String,        // Discord channel ID
  creator: {                // Ticket creator
    id: String,             // User ID
    username: String,       // Username
    discriminator: String   // User discriminator
  },
  title: String,            // Ticket title
  description: String,      // Ticket description
  category: String,         // Ticket category ID
  status: String,           // Current status
  priority: String,         // Priority level
  participants: [User],     // Array of users in the ticket
  claimedBy: User,          // Staff member who claimed the ticket
  createdAt: Date,          // Creation timestamp
  updatedAt: Date,          // Last update timestamp
  closedAt: Date,           // When the ticket was closed
  closedBy: User,           // Who closed the ticket
  closeReason: String       // Reason for closing
}
```

### TicketConfig
```javascript
{
  guildId: String,          // Discord guild ID
  ticketCategory: String,   // Category for ticket channels
  logChannel: String,       // Channel for system logs
  staffRoles: [String],     // Array of role IDs with staff permissions
  categories: [{            // Custom ticket categories
    id: String,             // Category ID
    name: String,           // Display name
    description: String,    // Category description
    staffRoles: [String]    // Roles that can handle these tickets
  }],
  maxTicketsPerUser: Number, // Max open tickets per user
  autoCloseInactiveTickets: Boolean, // Auto-close inactive tickets
  inactiveTicketDays: Number, // Days before auto-closing
  saveTranscripts: Boolean   // Whether to save transcripts
}
```

## API Reference

### REST API Endpoints

#### GET /api/tickets
List tickets with optional filters.

**Query Parameters:**
- `status`: Filter by status
- `category`: Filter by category
- `user`: Filter by user ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25)

**Response:**
```json
{
  "data": [Ticket],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "pages": 4
  }
}
```

#### POST /api/tickets
Create a new ticket.

**Request Body:**
```json
{
  "guildId": "1234567890",
  "creatorId": "1234567890",
  "title": "Help needed",
  "description": "I need help with...",
  "category": "support"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": Ticket,
  "channelId": "1234567890"
}
```

## Extending the System

### Adding New Commands
1. Create a new file in `src/commands/`
2. Export a command object with `data` and `execute` methods
3. Register the command in `src/commands/index.js`

Example command:
```javascript
module.exports = {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('Example command'),
    
  async execute(interaction) {
    await interaction.reply('This is an example command!');
  }
};
```

### Adding New Event Handlers
1. Create a new file in `src/events/`
2. Export an object with the event name and handler function
3. Register the event in `src/events/index.js`

Example event handler:
```javascript
module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.content === 'ping') {
      await message.reply('pong!');
    }
  }
};
```

## Testing

### Unit Tests
Run unit tests with:
```bash
npm test
```

### Integration Tests
Run integration tests with:
```bash
npm run test:integration
```

### Test Coverage
Generate a test coverage report:
```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Use 2 spaces for indentation
- Use semicolons
- Use camelCase for variables and functions
- Use PascalCase for classes
- Use UPPER_CASE for constants
- Use JSDoc for documentation

### Commit Message Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**
- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code changes that neither fix bugs nor add features
- test: Adding tests
- chore: Changes to the build process or auxiliary tools

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
