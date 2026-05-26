import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        const PREFIX = "nh!";

        if (!message.content.startsWith(PREFIX) || message.author.bot || !message.guild) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);

        if (command) {
            // Enhanced fakeInteraction to prevent errors with missing methods
            const fakeInteraction = {
                member: message.member,
                guild: message.guild,
                channel: message.channel,
                user: message.author,
                
                // Essential Slash Command methods
                reply: async (content) => message.reply(content),
                deferReply: async () => {}, // Prevents "deferReply is not a function" error
                editReply: async (content) => message.channel.send(content),
                followUp: async (content) => message.channel.send(content),
                
                // Properties often checked by commands
                deferred: false,
                replied: false,
                
                options: {
                    getMember: (name) => message.mentions.members.first() || message.member,
                    getString: (name) => args.join(' '),
                    getUser: (name) => message.mentions.users.first(),
                    getChannel: (name) => message.mentions.channels.first(),
                    getInteger: (name) => parseInt(args[0]) || 0
                }
            };

            try {
                await command.execute(fakeInteraction);
            } catch (error) {
                // Log the SPECIFIC error to your terminal
                logger.error(`Error executing ${commandName}:`, error);
                message.reply('An error occurred. Check terminal for details.');
            }
        }
    }
};
