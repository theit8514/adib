import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember, Permissions, MessageEmbed, EmbedFieldData } from 'discord.js';
import { getAdmins, isUserAdmin } from '../db.js';
import { ICommand } from '../icommand.js';

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('get-admins')
        .setDescription('Get a list of all admin users and roles')
        .addBooleanOption(option => option
            .setName("users")
            .setDescription("Only show users")
            .setRequired(false))
        .addBooleanOption(option => option
            .setName("roles")
            .setDescription("Only show roles")
            .setRequired(false)),
    // The execution method for this command
    async execute(interaction: CommandInteraction) {
        const member = interaction.member as GuildMember;
        const isGuildAdmin = member.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
        const isBotAdmin = isUserAdmin(interaction.guild.id, interaction.user.id, member.roles.cache.map(r => r.id));
        if (!isGuildAdmin && !isBotAdmin) {
            await interaction.reply("Sorry, I can't help you with that.");
            return;
        }

        const showUsers = !(interaction.options.getBoolean("users", false) || false);
        const showRoles = !(interaction.options.getBoolean("roles", false) || false);
        const admins = getAdmins(interaction.guild.id);
        const fields: EmbedFieldData[] = [];
        if (showUsers && admins.some(a => a.userId !== null)) {
            const users = admins.filter(a => a.userId !== null).map(a => interaction.guild.members.cache.get(a.userId));
            fields.push({
                name: 'Admin users',
                value: `${users.join('\r\n')}`
            });
        }
        if (showRoles && admins.some(a => a.roleId !== null)) {
            const roles = admins.filter(a => a.roleId !== null).map(a => interaction.guild.roles.cache.get(a.roleId));
            fields.push({
                name: 'Admin roles',
                value: `${roles.join('\r\n')}`
            });
        }
        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle("Admins")
            .addFields(...fields);
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};

export default definition;
