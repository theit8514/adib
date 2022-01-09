import findConfig from 'find-config'
import dotenv from 'dotenv'
dotenv.config({
    path: findConfig('.env')
});

import process from 'process'

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TOKEN = process.env.DISCORD_TOKEN;

export default { CLIENT_ID, GUILD_ID, TOKEN }