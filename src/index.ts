import fs from 'fs'

import discordConfig from './discord-config.js'
import { Client, Collection, CommandInteraction, Intents } from 'discord.js'
import { ICommand } from './icommand.js';
import * as db from './db.js';

db.initialize();

// Create a new client instance
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Ready!');
});

const commands = new Collection<string, ICommand>();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

await Promise.all(commandFiles.map(async file => {
    const commandImport = await import(`./commands/${file}`);
    const command = commandImport.default as ICommand;
    // Set a new item in the Collection
    // With the key as the command name and the value as the exported module
    commands.set(command.data.name, command);
}));

client.on('interactionCreate', async (interaction: CommandInteraction) => {
    if (!interaction.isCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        // If the interaction is no longer valid, this may fail. Don't worry about it.
        try { await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true }); }
        catch { }
    }
});

// Login to Discord with your client's token
client.login(discordConfig.TOKEN);

process.on('exit', () => {
    console.log('Exiting client');
    client.destroy();
});
