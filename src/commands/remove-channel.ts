import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember, Permissions } from 'discord.js';
import { isUserAdmin, removeChannel } from '../db.js';
import { ICommand } from '../icommand.js';

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('remove-channel')
        .setDescription('Prevent this bot from generating issue threads in this channel')
        .addChannelOption(option => option
            .setName("channel")
            .setDescription("The channel to remove")
            .setRequired(true)),
    // The execution method for this command
    async execute(interaction: CommandInteraction) {
        const member = interaction.member as GuildMember;
        const isGuildAdmin = member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
        const isBotAdmin = isUserAdmin(interaction.guild.id, interaction.user.id, member.roles.cache.map(r => r.id));
        if (!isGuildAdmin && !isBotAdmin) {
            return await interaction.reply("Sorry, I can't help you with that.");
        }

        const channel = interaction.options.getChannel("channel", true);
        removeChannel(interaction.guild.id, channel.id);
        await interaction.reply({
            content: `Removed channel <#${channel.id}> from the allowed channels list. I won't create threads in this channel anymore.`,
            ephemeral: true
        });
    }
};

export default definition;
