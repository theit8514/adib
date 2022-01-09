import findConfig from 'find-config'
import dotenv from 'dotenv'
dotenv.config({
    path: findConfig('.env')
});

import process from 'process'
import path from 'path'

const APP_ID = process.env.GITHUB_APP_ID;
const PRIVATE_KEY_FILE = path.resolve(process.cwd(), process.env.GITHUB_PRIVATE_KEY_FILE);
const REPOSITORY_OWNER = process.env.GITHUB_REPOSITORY_OWNER
const REPOSITORY_NAME = process.env.GITHUB_REPOSITORY_NAME

export default { APP_ID, PRIVATE_KEY_FILE, REPOSITORY_OWNER, REPOSITORY_NAME }