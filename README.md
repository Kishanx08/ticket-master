# Discord Ticket System

A powerful and customizable ticket management system for Discord, built with Node.js and Discord.js.

## Features

- 🎫 Create tickets with custom categories and priorities
- 🔒 Secure permission system with staff roles
- 📝 Rich ticket transcripts with message history
- 🔔 Configurable notifications for ticket events
- 🎨 Customizable ticket creation forms
- 🔄 Ticket claiming system for staff
- ⚙️ Web-based configuration panel
- 📊 Ticket analytics and reporting

## Prerequisites

- Node.js v16.9.0 or higher
- MongoDB database
- Discord Bot Token
- Discord Application with bot enabled

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/discord-ticket-bot.git
   cd discord-ticket-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   MONGODB_URI=your_mongodb_connection_string
   CLIENT_ID=your_bot_client_id
   ```

4. Start the bot:
   ```bash
   npm start
   ```

## Configuration

Use the `/ticket-config` command to configure the ticket system:

### Setup Categories
```
/ticket-config categories add name:"General Support" description:"Get help with general questions" staff-role:@Support
```

### Configure Settings
```
/ticket-config settings setting:logChannel channel:#ticket-logs
/ticket-config settings setting:staffRole role:@Support
/ticket-config settings setting:maxTickets number:3
```

## Usage

### Creating a Ticket
Use the `/ticket create` command or click the "Create Ticket" button in the ticket panel.

### Managing Tickets
- `/ticket add @user` - Add a user to the ticket
- `/ticket remove @user` - Remove a user from the ticket
- `/ticket close [reason]` - Close the current ticket
- `/ticket claim` - Claim a ticket (staff only)

### Staff Commands
- `/ticket-config` - Configure ticket system settings
- `/ticket stats` - View ticket statistics
- `/ticket list [status]` - List tickets with optional status filter

## Ticket Statuses

- 🟢 `open` - New ticket awaiting staff response
- 🟠 `in_progress` - Staff is working on the ticket
- 🟡 `awaiting_client` - Waiting for user response
- ✅ `resolved` - Ticket has been resolved
- 🔒 `closed` - Ticket is closed
- ⏸️ `on_hold` - Ticket is on hold

## Permissions

- **Administrators**: Full access to all ticket commands and configuration
- **Staff Roles**: Can manage tickets, view all tickets, and use staff commands
- **Users**: Can create and manage their own tickets

## Web Panel

Access the web panel at `http://localhost:3000` (when running locally) to:
- View ticket statistics
- Manage ticket categories
- Configure system settings
- View ticket history

## API Documentation

### Endpoints

#### GET /api/tickets
List all tickets (requires authentication)

**Query Parameters:**
- `status` - Filter by status
- `category` - Filter by category
- `assignedTo` - Filter by assigned staff
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 25)

#### GET /api/tickets/:id
Get ticket details

#### POST /api/tickets
Create a new ticket

#### PATCH /api/tickets/:id
Update a ticket

#### DELETE /api/tickets/:id
Close a ticket

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| DISCORD_TOKEN | Discord bot token | Yes | - |
| MONGODB_URI | MongoDB connection string | Yes | - |
| CLIENT_ID | Discord bot client ID | Yes | - |
| PORT | Web server port | No | 3000 |
| NODE_ENV | Environment (development/production) | No | development |
| LOG_LEVEL | Logging level | No | info |

## Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or join our [Discord server](https://discord.gg/your-invite).
