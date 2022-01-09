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
    guild: string;
    user: string | null;
    role: string | null;
}

export interface IChannel {
    guild: string;
    channel: string;
}

/**
 * Initialize the database
 */
export function initialize(): void {
    db.default({
        admins: [],
        channels: []
    });
    db.save();
}

/**
 * Add a channel to the channel table
 * @param guild The guild to add the channel for
 * @param user The channel id to add
 * @returns True if the channel was added, false if the channel already existed
 */
export function addChannel(guild: string, channel: string): boolean {
    const admins: Array<IChannel> = db.get("channels").value();
    if (admins.filter((a: IChannel) => a.guild === guild && a.channel == channel).length > 0) {
        return false;
    }
    db.get("channels").push({ guild: guild, channel: channel } as IChannel);
    db.save();
    return true;
}

/**
 * Remove a channel from the channel table
 * @param guild The guild to remove an admin user for
 * @param user The channel id to remove
 * @returns True if the channel was removed, false if the channel was not in the table
 */
export function removeChannel(guild: string, channel: string): boolean {
    const admins: Array<IChannel> = db.get("channels").value();
    if (admins.filter((a: IChannel) => a.guild === guild && a.channel == channel).length > 0) {
        return false;
    }
    (db.get("channels").filter as any)((a: IChannel) => a.guild !== guild || (a.guild === guild && a.channel !== channel));
    db.save();
    return true;
}

/**
 * Check if the channel is allowed by channel id
 * @param guild The guild to check admins for
 * @param channelId The channel id
 * @returns True if the channel is allowed
 */
export function isChannelAllowed(guild: string, channelId: string): boolean {
    const admins: Array<IChannel> = db.get("channels").value();
    return admins.filter((a: IChannel) => a.guild === guild && a.channel === channelId).length > 0;
}

/**
 * Get all the admins for this guild
 * @param guild The guild to retrieve admins for
 * @returns A list of the admin records
 */
export function getAdmins(guild: string): IAdmin[] {
    const admins: Array<IAdmin> = db.get("admins").value();
    return admins.filter((a: IAdmin) => a.guild === guild);
}

/**
 * Add a user to the admin table
 * @param guild The guild to add an admin user for
 * @param user The user id to add
 * @returns True if the user was added, false if the user already existed
 */
export function addUserAdmin(guild: string, user: string): boolean {
    const admins: Array<IAdmin> = db.get("admins").value();
    if (admins.filter((a: IAdmin) => a.guild === guild && a.user !== null && a.user == user).length > 0) {
        return false;
    }
    db.get("admins").push({ guild: guild, user: user, role: null } as IAdmin);
    db.save();
    return true;
}

/**
 * Add a role to the admin table
 * @param guild The guild to add an admin role for
 * @param role The role id to add
 * @returns True if the role was added, false if the role already existed
 */
export function addRoleAdmin(guild: string, role: string): boolean {
    const admins: Array<IAdmin> = db.get("admins").value();
    if (admins.filter((a: IAdmin) => a.guild === guild && a.role != null && a.role == role).length > 0) {
        return false;
    }
    db.get("admins").push({ guild: guild, user: null, role: role } as IAdmin);
    db.save();
    return true;
}

/**
 * Remove a user from the admin table
 * @param guild The guild to remove an admin user for
 * @param user The user id to remove
 * @returns True if the user was removed, false if the user was not in the table
 */
export function removeUserAdmin(guild: string, user: string): boolean {
    const admins: Array<IAdmin> = db.get("admins").value();
    if (admins.filter((a: IAdmin) => a.guild === guild && a.user !== null && a.user == user).length > 0) {
        return false;
    }
    (db.get("admins").filter as any)((a: IAdmin) => a.guild !== guild || (a.guild === guild && (a.user === null || a.user !== user)));
    db.save();
    return true;
}

/**
 * Remove a role from the admin table
 * @param guild The guild to remove an admin role for
 * @param user The role id to remove
 * @returns True if the role was removed, false if the role was not in the table
 */
export function removeRoleAdmin(guild: string, role: string): boolean {
    const admins: Array<IAdmin> = db.get("admins").value();
    if (admins.filter((a: IAdmin) => a.guild === guild && a.role != null && a.role == role).length === 0) {
        return false;
    }
    (db.get("admins").filter as any)((a: IAdmin) => a.guild !== guild || (a.guild === guild && (a.role === null || a.role !== role)));
    db.save();
    return true;
}

/**
 * Check if the user is an admin by user id or role id
 * @param guild The guild to check admins for
 * @param userId The user id of the current user
 * @param roleIds The role ids of the current user
 * @returns True if the user is an admin
 */
export function isUserAdmin(guild: string, userId: string, roleIds: string[]): boolean {
    const admins: Array<IAdmin> = db.get("admins").value();
    return admins.filter((a: IAdmin) => a.guild === guild && (
        (a.user !== null && a.user === userId) ||
        (a.role !== null && roleIds.includes(a.role))
    )).length > 0;
}
