import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember, Permissions } from 'discord.js';
import { isUserAdmin, removeDefaultLabel } from '../db.js';
import { ICommand } from '../icommand.js';

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('remove-default-label')
        .setDescription('Remove a default label from issues created in the future')
        .addStringOption(option => option
            .setName("label")
            .setDescription("The label (case sensitive)")
            .setRequired(true)),
    // The execution method for this command
    async execute(interaction: CommandInteraction) {
        const member = interaction.member as GuildMember;
        const isGuildAdmin = member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
        const isBotAdmin = isUserAdmin(interaction.guild.id, interaction.user.id, member.roles.cache.map(r => r.id));
        if (!isGuildAdmin && !isBotAdmin) {
            await interaction.reply("Sorry, I can't help you with that.");
            return;
        }

        const label = interaction.options.getString("label", true);
        removeDefaultLabel(interaction.guild.id, label);
        await interaction.reply({
            content: `Removed ${label} from the default labels. I won't create issues with this label anymore.`,
            ephemeral: true
        });
    }
};

export default definition;
