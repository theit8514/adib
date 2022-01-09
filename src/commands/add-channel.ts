import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember, Permissions } from 'discord.js';
import { addChannel, isUserAdmin } from '../db.js';
import { ICommand } from '../icommand.js';

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('add-channel')
        .setDescription('Allow issue threads to be created on a new channel')
        .addChannelOption(option => option
            .setName("channel")
            .setDescription("The channel to create threads in")
            .setRequired(true)),
    // The execution method for this command
    async execute(interaction: CommandInteraction) {
        const member = interaction.member as GuildMember;
        const isGuildAdmin = member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
        const isBotAdmin = isUserAdmin(interaction.guild.id, interaction.user.id, member.roles.cache.map(r => r.id));
        if (!isGuildAdmin && !isBotAdmin) {
            await interaction.reply({
                content: "Sorry, I can't help you with that.",
                ephemeral: true
            });
            return;
        }

        const channel = interaction.options.getChannel("channel", true);

        if (addChannel(interaction.guild.id, channel.id)) {
            await interaction.reply({
                content: `Added channel <#${channel.id}> to the allowed channels list. I will create an issue thread in this channel when requested.`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `Already had channel <#${channel.id}> on my allowed channels list.`,
                ephemeral: true
            });
        }
    }
};

export default definition;
