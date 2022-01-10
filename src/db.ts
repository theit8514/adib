import StormDB from 'stormdb'
import fs from 'fs'
import path from 'path'
import process from 'process'

const dataDir = path.resolve(process.cwd(), './data');

try {
    if (!fs.existsSync(dataDir))
        fs.mkdirSync(dataDir);
}
catch {
}

const engine = new StormDB.localFileEngine(path.resolve(dataDir, 'db.stormdb'));
const db = new StormDB(engine);

export interface IAdmin {
    guildId: string;
    userId: string | null;
    roleId: string | null;
}

export class AdminUser implements IAdmin {
    guildId: string;
    userId: string;
    roleId: string | null;
    constructor(guildId: string, userId: string) {
        this.guildId = guildId;
        this.userId = userId;
    }
}

export class AdminRole implements IAdmin {
    guildId: string;
    userId: string | null;
    roleId: string;
    constructor(guildId: string, roleId: string) {
        this.guildId = guildId;
        this.roleId = roleId;
    }
}

export interface IChannel {
    guild: string;
    channel: string;
}

export class Guild {
    guildId: string;
    labels: string[] = [];
    adminUsers: string[] = [];
    adminRoles: string[] = [];
    allowedChannels: string[] = [];

    constructor(guildId: string) {
        this.guildId = guildId;
    }

    validate(): void {
        this.labels = this.labels ?? [];
        this.adminUsers = this.adminUsers ?? [];
        this.adminRoles = this.adminRoles ?? [];
        this.allowedChannels = this.allowedChannels ?? [];
    }
}

/**
 * Initialize the database
 */
export function initialize(): void {
    db.default({
        guilds: {}
    });
    if (db.get("guilds").value() === undefined) {
        db.set("guilds", {})
    }
    db.save();
}

function getGuild(guildId: string): Guild {
    const guilds = db.get("guilds").value();
    const guild: Guild = guilds[guildId] || new Guild(guildId);
    Object.setPrototypeOf(guild, Guild.prototype);
    guild.validate();
    return guild;
}

function saveGuild(guild: Guild): void {
    const guilds = db.get("guilds");
    guilds.set(guild.guildId, guild);
    db.save();
}

/**
 * Get the default labels defined for this guild
 * @param guildId The guild id of the guild to query
 * @returns An array of label names
 */
export function getDefaultLabels(guildId: string): string[] {
    const guild = getGuild(guildId);
    return guild.labels;
}

/**
 * Add a label to the default labels added for issues
 * @param guildId The guild to add the default label for
 * @param label The default label name
 * @returns True if the label was added, false if the label already exists
 */
export function addDefaultLabel(guildId: string, label: string): boolean {
    const guild = getGuild(guildId);
    if (guild.labels.some(l => l === label)) {
        return false;
    }
    guild.labels.push(label);
    saveGuild(guild);
    return true;
}

/**
 * Remove a label from the default labels added for issues
 * @param guildId The guild to add the default label for
 * @param label The default label name
 * @returns True if the label was removed, false if the label was not in the table
 */
 export function removeDefaultLabel(guildId: string, label: string): boolean {
    const guild = getGuild(guildId);
    if (!guild.labels.some(l => l === label)) {
        return false;
    }
    guild.labels = guild.labels.filter(x => x !== label);
    saveGuild(guild);
    return true;
}

/**
 * Get the allowed channels defined for this guild
 * @param guildId The guild id of the guild to query
 * @returns An array of channel ids
 */
export function getChannels(guildId: string): string[] {
    const guild = getGuild(guildId);
    return guild.allowedChannels.slice();
}

/**
 * Add a channel to the channel table
 * @param guildId The guild to add the channel for
 * @param channelId The channel id to add
 * @returns True if the channel was added, false if the channel already existed
 */
export function addChannel(guildId: string, channelId: string): boolean {
    const guild = getGuild(guildId);
    if (guild.allowedChannels.some(c => c === channelId)) {
        return false;
    }
    guild.allowedChannels.push(channelId);
    saveGuild(guild);
    return true;
}

/**
 * Remove a channel from the channel table
 * @param guildId The guild to remove an admin user for
 * @param user The channel id to remove
 * @returns True if the channel was removed, false if the channel was not in the table
 */
export function removeChannel(guildId: string, channelId: string): boolean {
    const guild = getGuild(guildId);
    if (!guild.allowedChannels.some(c => c === channelId)) {
        return false;
    }
    guild.allowedChannels = guild.allowedChannels.filter(c => c !== channelId);
    saveGuild(guild);
    return true;
}

/**
 * Check if the channel is allowed by channel id
 * @param guildId The guild to check admins for
 * @param channelId The channel id
 * @returns True if the channel is allowed
 */
export function isChannelAllowed(guildId: string, channelId: string): boolean {
    const guild = getGuild(guildId);
    return guild.allowedChannels.some(c => c === channelId);
}

/**
 * Get all the admins for this guild
 * @param guildId The guild to retrieve admins for
 * @returns A list of the admin records
 */
export function getAdmins(guildId: string): IAdmin[] {
    const guild = getGuild(guildId);
    return guild.adminUsers.map(u => new AdminUser(guild.guildId, u)).concat(guild.adminRoles.map(r => new AdminRole(guild.guildId, r)));
}

/**
 * Add a user to the admin table
 * @param guildId The guild to add an admin user for
 * @param userId The user id to add
 * @returns True if the user was added, false if the user already existed
 */
export function addUserAdmin(guildId: string, userId: string): boolean {
    const guild = getGuild(guildId);
    if (guild.adminUsers.some(a => a === userId)) {
        return false;
    }
    guild.adminUsers.push(userId);
    saveGuild(guild);
    return true;
}

/**
 * Add a role to the admin table
 * @param guildId The guild to add an admin role for
 * @param roleId The role id to add
 * @returns True if the role was added, false if the role already existed
 */
export function addRoleAdmin(guildId: string, roleId: string): boolean {
    const guild = getGuild(guildId);
    if (guild.adminRoles.some(a => a === roleId)) {
        return false;
    }
    guild.adminRoles.push(roleId);
    saveGuild(guild);
    return true;
}

/**
 * Remove a user from the admin table
 * @param guildId The guild to remove an admin user for
 * @param userId The user id to remove
 * @returns True if the user was removed, false if the user was not in the table
 */
export function removeUserAdmin(guildId: string, userId: string): boolean {
    const guild = getGuild(guildId);
    if (!guild.adminUsers.some(a => a === userId)) {
        return false;
    }
    guild.adminUsers = guild.adminUsers.filter(c => c !== userId);
    saveGuild(guild);
    return true;
}

/**
 * Remove a role from the admin table
 * @param guildId The guild to remove an admin role for
 * @param roleId The role id to remove
 * @returns True if the role was removed, false if the role was not in the table
 */
export function removeRoleAdmin(guildId: string, roleId: string): boolean {
    const guild = getGuild(guildId);
    if (!guild.adminRoles.some(a => a === roleId)) {
        return false;
    }
    guild.adminRoles = guild.adminRoles.filter(c => c !== roleId);
    saveGuild(guild);
    return true;
}

/**
 * Check if the user is an admin by user id or role id
 * @param guildId The guild to check admins for
 * @param userId The user id of the current user
 * @param roleIds The role ids of the current user
 * @returns True if the user is an admin
 */
export function isUserAdmin(guildId: string, userId: string, roleIds: string[]): boolean {
    const guild = getGuild(guildId);
    return guild.adminUsers.some(a => a === userId) || guild.adminRoles.some(a => roleIds.includes(a));
}
