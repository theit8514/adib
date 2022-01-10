import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember, Permissions } from 'discord.js';
import { addDefaultLabel, isUserAdmin } from '../db.js';
import { ICommand } from '../icommand.js';

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('add-default-label')
        .setDescription('Add a default label to all issues going forward')
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
            await interaction.reply({
                content: "Sorry, I can't help you with that.",
                ephemeral: true
            });
            return;
        }

        const label = interaction.options.getString("label", true);

        if (addDefaultLabel(interaction.guild.id, label)) {
            await interaction.reply({
                content: `Added label ${label} to the default labels list. I will create issues with this label going forward.`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `Already had label <#${label}> on my default labels list.`,
                ephemeral: true
            });
        }
    }
};

export default definition;
