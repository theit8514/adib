import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember, Permissions } from 'discord.js';
import { removeRoleAdmin, removeUserAdmin, isUserAdmin } from '../db.js';
import { ICommand } from '../icommand.js';

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('remove-admin')
        .setDescription('Remove an admin user or role')
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user to remove admin privileges for")
            .setRequired(false))
        .addRoleOption(option => option
            .setName("role")
            .setDescription("The role to remove admin privileges for")
            .setRequired(false)),
    // The execution method for this command
    async execute(interaction: CommandInteraction) {
        const member = interaction.member as GuildMember;
        if (!member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) || !isUserAdmin(interaction.guild.id, interaction.user.id, member.roles.cache.map(r => r.id))) {
            return await interaction.reply("Sorry, I can't help you with that.");
        }

        const role = interaction.options.getRole("role", false);
        const user = interaction.options.getUser("user", false);
        if (user === null && role === null) {
            return await interaction.reply("Must provide user or role.");
        }

        if (role !== null) {
            removeRoleAdmin(interaction.guild.id, role.id);
            await interaction.reply({
                content: `Removed role ${role.name} to my admin list.`,
                ephemeral: true
            });
        }

        if (user !== null) {
            removeUserAdmin(interaction.guild.id, user.id);
            await interaction.reply({
                content: `Removed user ${user.tag} to my admin list.`,
                ephemeral: true
            });
        }
    }
};

export default definition;