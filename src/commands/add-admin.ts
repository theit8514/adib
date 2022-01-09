import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember, Permissions } from 'discord.js';
import { addRoleAdmin, addUserAdmin, isUserAdmin } from '../db.js';
import { ICommand } from '../icommand.js';

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('add-admin')
        .setDescription('Add a new admin user or role')
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user to add admin privileges for")
            .setRequired(false))
        .addRoleOption(option => option
            .setName("role")
            .setDescription("The role to add admin privileges for")
            .setRequired(false)),
    // The execution method for this command
    async execute(interaction: CommandInteraction) {
        const member = interaction.member as GuildMember;
        const isGuildAdmin = member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
        if (!isGuildAdmin) {
            return await interaction.reply({
                content: "Sorry, I can't help you with that.",
                ephemeral: true
            });
        }

        const role = interaction.options.getRole("role", false);
        const user = interaction.options.getUser("user", false);
        if (user === null && role === null) {
            return await interaction.reply({
                content: "Must provide user or role.",
                ephemeral: true
            });
        }

        if (role !== null) {
            if (addRoleAdmin(interaction.guild.id, role.id)) {
                await interaction.reply({
                    content: `Added role ${role.name} to my admin list.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `Already had role ${role.name} on my admin list.`,
                    ephemeral: true
                });
            }
        }

        if (user !== null) {
            if (addUserAdmin(interaction.guild.id, user.id)) {
                await interaction.reply({
                    content: `Added user ${user.tag} to my admin list.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `Already had user ${user.tag} on my admin list.`,
                    ephemeral: true
                })
            }
        }
    }
};

export default definition;
