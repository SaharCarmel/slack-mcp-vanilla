# Slack MCP Server

A Model Context Protocol (MCP) server that provides comprehensive Slack workspace integration, enabling AI assistants to interact with Slack channels, messages, threads, and users.

## Features

- **Channel Management**: List channels and retrieve message history
- **Messaging**: Send messages and reply to threads
- **User Interaction**: Look up users and their profiles
- **Reactions**: Add emoji reactions to messages
- **Thread Support**: Full thread conversation handling
- **Multi-channel Support**: Optional channel filtering for focused interactions

## Available Tools

### `slack_list_channels`
Retrieve a list of public channels in your Slack workspace
- Supports pagination (cursor-based)
- Optional channel ID filtering
- Returns channel names, IDs, and metadata

### `slack_post_message`
Send messages to specific Slack channels
- Requires channel ID and message text
- Supports rich text formatting

### `slack_reply_to_thread`
Reply to existing message threads
- Maintains thread context
- Requires parent message timestamp

### `slack_add_reaction`
Add emoji reactions to messages
- Standard Slack emoji support
- Requires message timestamp and channel

### `slack_get_channel_history`
Fetch recent messages from channels
- Configurable message limit (default: 10)
- Returns full message context including threads

### `slack_get_thread_replies`
Retrieve all replies in a message thread
- Complete thread conversation history
- Maintains chronological order

### `slack_get_users`
List workspace users with profile information
- Pagination support (max 200 per request)
- Basic user details and status

### `slack_get_user_profile`
Get detailed profile information for specific users
- Extended user metadata
- Profile fields and custom status

## Installation

### Prerequisites
- Node.js (version 16+)
- A Slack workspace with bot permissions
- Slack Bot Token (xoxb-*)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SaharCarmel/slack-mcp-vanilla.git
   cd slack-mcp-vanilla
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the server**
   ```bash
   npm run build
   ```

## Configuration

### Slack Bot Setup

1. **Create a Slack App** at https://api.slack.com/apps
2. **Add Bot Token Scopes**:
   - `channels:read` - List public channels
   - `channels:history` - Read channel messages
   - `chat:write` - Send messages
   - `reactions:write` - Add reactions
   - `users:read` - Access user information
   - `users:read.email` - Access user emails (optional)

3. **Install App** to your workspace and copy the Bot User OAuth Token

### Environment Variables

Create a `.env` file or set these environment variables:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_TEAM_ID=your-team-id
SLACK_CHANNEL_IDS=C1234567890,C0987654321  # Optional: comma-separated channel IDs
```

### Claude Desktop Integration

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slack": {
      "command": "node",
      "args": ["/path/to/slack-mcp-vanilla/build/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
        "SLACK_TEAM_ID": "your-team-id",
        "SLACK_CHANNEL_IDS": ""
      },
      "autoApprove": [
        "slack_get_channel_history",
        "slack_get_thread_replies"
      ],
      "disabled": false,
      "timeout": 60,
      "transportType": "stdio"
    }
  }
}
```

## Usage Examples

Once configured, you can ask Claude to:

- "Show me the latest messages in #general"
- "Post a message to #announcements saying the meeting is at 3pm"
- "Who are the users in this workspace?"
- "Reply to that thread with a thumbs up reaction"
- "Get the conversation history from #development channel"

## Security Considerations

- **Token Security**: Never commit your Slack bot token to version control
- **Permissions**: Grant minimal required scopes to your Slack app
- **Channel Access**: Use `SLACK_CHANNEL_IDS` to restrict access to specific channels
- **Rate Limits**: The server respects Slack's API rate limits

## Troubleshooting

### Common Issues

1. **"Missing authentication token"**
   - Verify `SLACK_BOT_TOKEN` is set correctly
   - Ensure the token starts with `xoxb-`

2. **"Channel not found"**
   - Check channel IDs in `SLACK_CHANNEL_IDS`
   - Verify bot has access to the requested channels

3. **"Insufficient permissions"**
   - Review bot token scopes in your Slack app settings
   - Reinstall the app if you've added new scopes

### Debugging

Enable MCP Inspector for detailed debugging:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Development

### Building
```bash
npm run build
```

### Project Structure
```
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `@slack/web-api` - Official Slack Web API client
- `typescript` - TypeScript compiler

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

For more information about Model Context Protocol, visit: https://modelcontextprotocol.io