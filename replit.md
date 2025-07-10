# Discord Ticket Bot

## Overview

This is a fully customizable Discord bot application built with Discord.js v14 that provides a comprehensive ticket management system for freelance web development services. The bot features categorized ticket creation, automated status updates, transcript generation, and complete configuration customization through both commands and file editing.

## User Preferences

Preferred communication style: Simple, everyday language.
**Latest Request (Dec 2024):** Complete live configuration system through Discord commands only - no manual file editing required. Interactive popup-based configuration for all bot settings including setup embed, ticket types, status messages, colors, and bot messages.

**Critical Fixes Implemented (Dec 2024):**
- MongoDB database integration with flexible schemas and collections
- Removed single ticket limitation - users can now create multiple tickets
- Added admin-only permission checks to all administrative commands
- Fixed logical issues in ticket creation and management
- Implemented proper database-driven ticket system with persistent storage
- Converted from PostgreSQL to MongoDB for improved scalability and flexibility
- Fixed invalid emoji and color format issues in configuration system
- Added input validation for Discord emoji format compliance
- Resolved MongoDB connection string exposure in logs
- Fixed malformed JSON configuration entries

## System Architecture

### Frontend Architecture
- **Discord.js Client**: The main interface is through Discord's native slash commands and interactive components (buttons, modals)
- **Slash Commands**: Modern Discord command system using `/ticket` with subcommands
- **Interactive Components**: Buttons for ticket creation and modals for collecting user information
- **Embeds**: Rich message formatting for better user experience

### Backend Architecture
- **Node.js Runtime**: Server-side JavaScript execution
- **Event-Driven Architecture**: Discord.js event system handling interactions and bot lifecycle
- **Modular Command System**: Commands organized in separate files with automatic loading
- **File-Based Data Storage**: JSON files for persistence (tickets.json, config.json)

### Data Storage Solutions
- **MongoDB Database**: NoSQL database with flexible schemas for tickets, guilds, and messages
- **Mongoose ODM**: Object modeling with schema validation and query building
- **Persistent Storage**: All ticket data, configurations, and user interactions stored in MongoDB

## Key Components

### Core Modules
1. **index.js**: Main entry point, bot initialization, command/event loading
2. **Command System**: Modular slash command handling with automatic registration
3. **Event System**: Discord event handlers for interactions and bot ready state
4. **Ticket Manager**: Core business logic for ticket operations
5. **Database Utility**: File-based data persistence layer

### Command Structure
- **Primary Commands**: 
  - `/ticket` - Main ticket management system
    - `setup`: Configure ticket system with customizable embed and categorized buttons
    - `close`: Close current ticket with automatic transcript generation
    - `add`: Add user to ticket
    - `remove`: Remove user from ticket
    - `status`: Change ticket status with automated client notifications
    - `transcript`: Generate and download conversation transcript
  - `/configure` - Comprehensive configuration system
    - `setup-embed`: Customize ticket creation embed (title, description, colors, footer)
    - `ticket-types`: View current ticket types and modification instructions
    - `status-messages`: View/modify automated status update messages
    - `settings`: View/modify general bot settings
    - `export`: Export current configuration as JSON file
    - `reset`: Instructions for resetting to defaults

### Configuration System
- **Global Config**: `config.json` with default settings, messages, and embed colors
- **Per-Server Config**: Stored in database for ticket categories and roles
- **Customizable Messages**: Predefined responses for different ticket states

## Data Flow

1. **Enhanced Ticket Creation Flow**:
   - User selects ticket type (Order Website, Existing Project Support, etc.)
   - Customized modal appears with type-specific questions
   - System checks for existing active tickets (max 1 per user)
   - Creates new private channel with appropriate permissions
   - Stores comprehensive ticket data including form responses and metadata
   - Sends welcome message with status management buttons

2. **Advanced Ticket Management Flow**:
   - Quick-action buttons for status changes (In Progress, Awaiting Client, Testing, Completed)
   - Automated status update messages sent to clients
   - Staff can add/remove users, generate transcripts, modify status
   - Ticket closure with automatic transcript generation and DM delivery
   - Optional archiving system with organized categories

3. **Configuration Management**:
   - Live embed customization through `/configure setup-embed`
   - Ticket type management via config.json editing
   - Status message customization with colors and automated notifications
   - Export/import functionality for configuration backup

4. **Permission Management**:
   - Automatic channel permission setup for ticket creator and support staff
   - Role-based access control for administrative functions
   - Enhanced security with transcript generation and user notification systems

## External Dependencies

### Core Dependencies
- **discord.js v14.21.0**: Primary Discord API wrapper
- **Node.js Built-ins**: 
  - `fs` and `fs/promises`: File system operations
  - `path`: File path management

### Discord API Features Used
- **Gateway Intents**: Guilds, GuildMessages, MessageContent, GuildMembers
- **Slash Commands**: Modern command interface
- **Interactive Components**: Buttons and modals for user interaction
- **Channel Management**: Dynamic channel creation with permission overrides
- **Embed Messages**: Rich message formatting

## Deployment Strategy

### Environment Setup
- **Environment Variables**: Discord bot token (`DISCORD_TOKEN`)
- **File Permissions**: Write access to `/data` directory for JSON storage
- **Node.js Runtime**: Requires Node.js 16.11.0 or higher

### Scaling Considerations
- **Current Architecture**: Single-server, file-based storage
- **Limitations**: No horizontal scaling support with current JSON file approach
- **Future Migration Path**: Database utility designed for easy migration to SQL database

### Error Handling
- **Global Error Catching**: Unhandled promise rejection handling
- **Command Error Recovery**: Graceful error responses to users
- **File System Resilience**: Automatic directory and file creation

### Security Measures
- **Permission Validation**: Server permission checks for administrative commands
- **User Isolation**: Private ticket channels with restricted access
- **Input Validation**: Modal input handling and sanitization

The architecture prioritizes simplicity and ease of deployment while maintaining extensibility for future enhancements. The modular design allows for easy addition of new features and migration to more robust data storage solutions as needed.