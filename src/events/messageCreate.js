import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        const PREFIX = "nh!";
        if (!message.content.startsWith(PREFIX) || message.author.bot || !message.guild) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // --- ALL PREFIX COMMANDS LIST ---
        const commandsList = {
            'ping': (msg) => msg.reply('Pong! 🏓'),
            
            'info': (msg) => msg.reply('Bot Starlight Security is online! 🚀'),
            
            'server': (msg) => msg.reply(`Server name: ${msg.guild.name}`),
            
            'say': (msg, args) => {
                if (!args.length) return msg.reply('You haven\'t provided any content!');
                msg.channel.send(args.join(' '));
            },

            'avatar': (msg) => {
                const user = msg.mentions.users.first() || msg.author;
                msg.reply(user.displayAvatarURL({ dynamic: true, size: 512 }));
            },

            'user': (msg) => {
                const user = msg.mentions.users.first() || msg.author;
                msg.reply(`User: ${user.username}\nID: ${user.id}\nJoined: ${user.createdAt.toDateString()}`);
            },

            'uptime': (msg) => {
                const uptime = process.uptime();
                const days = Math.floor(uptime / 86400);
                const hours = Math.floor(uptime / 3600) % 24;
                const minutes = Math.floor(uptime / 60) % 60;
                msg.reply(`Bot has been online for: ${days}d ${hours}h ${minutes}m`);
            },

            'help': (msg) => {
                msg.reply('**List of available nh! commands:**\n- `ping`: Check latency\n- `info`: Bot status\n- `server`: Server info\n- `say`: Repeat text\n- `avatar`: Get user avatar\n- `user`: Get user info\n- `uptime`: Bot uptime\n- `help`: This menu');
            }
        };

        // --- EXECUTION ---
        if (commandsList[commandName]) {
            try {
                await commandsList[commandName](message, args);
            } catch (error) {
                logger.error(`Error executing command ${commandName}:`, error);
                message.reply('An error occurred while executing this command.');
            }
        }
    }
};
