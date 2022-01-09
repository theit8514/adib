import fs from 'fs'

import discordConfig from './discord-config.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { ICommand } from './icommand.js';

const rest = new REST({ version: '9' }).setToken(discordConfig.TOKEN);

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const commands = await Promise.all(commandFiles.map(async file => {
    const commandImport = await import(`./commands/${file}`);
    const command = commandImport.default as ICommand;
    return command.data.toJSON();
}));

rest.put(Routes.applicationGuildCommands(discordConfig.CLIENT_ID, discordConfig.GUILD_ID), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);
