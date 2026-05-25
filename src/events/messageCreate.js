import { Events, PermissionsBitField } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        const PREFIX = "nh!";
        if (!message.content.startsWith(PREFIX) || message.author.bot || !message.guild) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // --- COMMANDS LIST ---
        const commandsList = {
            // Utility Commands
            'ping': (msg) => msg.reply('Pong! 🏓'),
            'info': (msg) => msg.reply('Bot Starlight Security is online! 🚀'),
            'uptime': (msg) => {
                const up = process.uptime();
                msg.reply(`Uptime: ${Math.floor(up/86400)}d ${Math.floor(up/3600)%24}h ${Math.floor(up/60)%60}m`);
            },

            // Security Commands (Admin only)
            'lock': async (msg) => {
                if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return msg.reply('Missing permissions!');
                await msg.channel.permissionOverwrites.edit(msg.guild.id, { SendMessages: false });
                msg.reply('Channel locked 🔒');
            },
            'unlock': async (msg) => {
                if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return msg.reply('Missing permissions!');
                await msg.channel.permissionOverwrites.edit(msg.guild.id, { SendMessages: true });
                msg.reply('Channel unlocked 🔓');
            },
            'kick': async (msg) => {
                if (!msg.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return msg.reply('Missing permissions!');
                const member = msg.mentions.members.first();
                if (!member) return msg.reply('Mention a member to kick!');
                await member.kick().catch(e => msg.reply('Failed to kick.'));
                msg.reply(`Kicked ${member.user.tag}`);
            },
            'ban': async (msg) => {
                if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return msg.reply('Missing permissions!');
                const member = msg.mentions.members.first();
                if (!member) return msg.reply('Mention a member to ban!');
                await member.ban().catch(e => msg.reply('Failed to ban.'));
                msg.reply(`Banned ${member.user.tag}`);
            },

            'help': (msg) => {
                msg.reply('**Available nh! commands:**\n- `ping`, `info`, `uptime`\n- `lock`, `unlock` (Channel)\n- `kick`, `ban` (@user)');
            }
        };

        // --- EXECUTION ---
        if (commandsList[commandName]) {
            try {
                await commandsList[commandName](message, args);
            } catch (error) {
                logger.error(`Error executing ${commandName}:`, error);
                message.reply('An error occurred.');
            }
        }
    }
};
