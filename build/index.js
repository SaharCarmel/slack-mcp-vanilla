#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { WebClient } from '@slack/web-api';
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const TEAM_ID = process.env.SLACK_TEAM_ID;
const CHANNEL_IDS = process.env.SLACK_CHANNEL_IDS?.split(',').map(id => id.trim());
if (!BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN environment variable is required');
}
if (!TEAM_ID) {
    throw new Error('SLACK_TEAM_ID environment variable is required');
}
class SlackServer {
    constructor() {
        this.server = new Server({
            name: 'slack-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.slack = new WebClient(BOT_TOKEN);
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'slack_list_channels',
                    description: 'List public or pre-defined channels in the workspace',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: {
                                type: 'number',
                                description: 'Maximum number of channels to return (max: 200)',
                                default: 100,
                                maximum: 200,
                            },
                            cursor: {
                                type: 'string',
                                description: 'Pagination cursor for next page',
                            },
                        },
                    },
                },
                {
                    name: 'slack_post_message',
                    description: 'Post a new message to a Slack channel',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            channel_id: {
                                type: 'string',
                                description: 'The ID of the channel to post to',
                            },
                            text: {
                                type: 'string',
                                description: 'The message text to post',
                            },
                        },
                        required: ['channel_id', 'text'],
                    },
                },
                {
                    name: 'slack_reply_to_thread',
                    description: 'Reply to a specific message thread',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            channel_id: {
                                type: 'string',
                                description: 'The channel containing the thread',
                            },
                            thread_ts: {
                                type: 'string',
                                description: 'Timestamp of the parent message',
                            },
                            text: {
                                type: 'string',
                                description: 'The reply text',
                            },
                        },
                        required: ['channel_id', 'thread_ts', 'text'],
                    },
                },
                {
                    name: 'slack_add_reaction',
                    description: 'Add an emoji reaction to a message',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            channel_id: {
                                type: 'string',
                                description: 'The channel containing the message',
                            },
                            timestamp: {
                                type: 'string',
                                description: 'Message timestamp to react to',
                            },
                            reaction: {
                                type: 'string',
                                description: 'Emoji name without colons',
                            },
                        },
                        required: ['channel_id', 'timestamp', 'reaction'],
                    },
                },
                {
                    name: 'slack_get_channel_history',
                    description: 'Get recent messages from a channel',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            channel_id: {
                                type: 'string',
                                description: 'The channel ID',
                            },
                            limit: {
                                type: 'number',
                                description: 'Number of messages to retrieve',
                                default: 10,
                            },
                        },
                        required: ['channel_id'],
                    },
                },
                {
                    name: 'slack_get_thread_replies',
                    description: 'Get all replies in a message thread',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            channel_id: {
                                type: 'string',
                                description: 'The channel containing the thread',
                            },
                            thread_ts: {
                                type: 'string',
                                description: 'Timestamp of the parent message',
                            },
                        },
                        required: ['channel_id', 'thread_ts'],
                    },
                },
                {
                    name: 'slack_get_users',
                    description: 'Get list of workspace users with basic profile information',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            cursor: {
                                type: 'string',
                                description: 'Pagination cursor for next page',
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum users to return (max: 200)',
                                default: 100,
                                maximum: 200,
                            },
                        },
                    },
                },
                {
                    name: 'slack_get_user_profile',
                    description: 'Get detailed profile information for a specific user',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            user_id: {
                                type: 'string',
                                description: 'The user\'s ID',
                            },
                        },
                        required: ['user_id'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                switch (request.params.name) {
                    case 'slack_list_channels': {
                        const { limit = 100, cursor } = request.params.arguments;
                        const result = await this.slack.conversations.list({
                            limit: Math.min(limit, 200),
                            cursor,
                            types: 'public_channel',
                            team_id: TEAM_ID,
                        });
                        let channels = result.channels || [];
                        if (CHANNEL_IDS?.length) {
                            channels = channels.filter(channel => CHANNEL_IDS.includes(channel.id));
                        }
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(channels, null, 2),
                                },
                            ],
                        };
                    }
                    case 'slack_post_message': {
                        const { channel_id, text } = request.params.arguments;
                        const result = await this.slack.chat.postMessage({
                            channel: channel_id,
                            text,
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result, null, 2),
                                },
                            ],
                        };
                    }
                    case 'slack_reply_to_thread': {
                        const { channel_id, thread_ts, text } = request.params.arguments;
                        const result = await this.slack.chat.postMessage({
                            channel: channel_id,
                            thread_ts,
                            text,
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result, null, 2),
                                },
                            ],
                        };
                    }
                    case 'slack_add_reaction': {
                        const { channel_id, timestamp, reaction } = request.params.arguments;
                        const result = await this.slack.reactions.add({
                            channel: channel_id,
                            timestamp,
                            name: reaction,
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result, null, 2),
                                },
                            ],
                        };
                    }
                    case 'slack_get_channel_history': {
                        const { channel_id, limit = 10 } = request.params.arguments;
                        const result = await this.slack.conversations.history({
                            channel: channel_id,
                            limit,
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result.messages, null, 2),
                                },
                            ],
                        };
                    }
                    case 'slack_get_thread_replies': {
                        const { channel_id, thread_ts } = request.params.arguments;
                        const result = await this.slack.conversations.replies({
                            channel: channel_id,
                            ts: thread_ts,
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result.messages, null, 2),
                                },
                            ],
                        };
                    }
                    case 'slack_get_users': {
                        const { cursor, limit = 100 } = request.params.arguments;
                        const result = await this.slack.users.list({
                            limit: Math.min(limit, 200),
                            cursor,
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result.members, null, 2),
                                },
                            ],
                        };
                    }
                    case 'slack_get_user_profile': {
                        const { user_id } = request.params.arguments;
                        const result = await this.slack.users.info({
                            user: user_id,
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result.user, null, 2),
                                },
                            ],
                        };
                    }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Slack API error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Slack MCP server running on stdio');
    }
}
const server = new SlackServer();
server.run().catch(console.error);
