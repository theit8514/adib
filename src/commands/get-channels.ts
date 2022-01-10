import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember, Permissions, MessageEmbed } from 'discord.js';
import { getChannels, isUserAdmin } from '../db.js';
import { ICommand } from '../icommand.js';

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('get-channels')
        .setDescription('Get a list of allowed channels'),
    // The execution method for this command
    async execute(interaction: CommandInteraction) {
        const member = interaction.member as GuildMember;
        const isGuildAdmin = member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
        const isBotAdmin = isUserAdmin(interaction.guild.id, interaction.user.id, member.roles.cache.map(r => r.id));
        if (!isGuildAdmin && !isBotAdmin) {
            await interaction.reply("Sorry, I can't help you with that.");
            return;
        }

        const channels = getChannels(interaction.guild.id);
        if (channels.length === 0) {
            await interaction.reply({
                content: "No channels added.",
                ephemeral: true
            });
        }
        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle("Admin table")
            .addFields({
                name: 'Channels',
                value: `${channels.map(c => interaction.guild.channels.cache.get(c)).join('\r\n')}`
            });
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};

export default definition;
