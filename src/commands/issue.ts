import { SlashCommandBuilder } from '@discordjs/builders'
import { BaseGuildTextChannel, CommandInteraction, MessageAttachment } from 'discord.js';
import { ICommand } from '../icommand';
import { createIssue } from '../interfaces/github/index.js'
import { isChannelAllowed, isUserAdmin } from '../db.js'

const states = {
    NEED_TITLE: "NEED_TITLE",
    READY_FOR_DESCRIPTION: "READY_FOR_DESCRIPTION",
    MORE_DESCRIPTION: "MORE_DESCRIPTION",
    PLEASE_WAIT: "PLEASE_WAIT",
    WONT_FIX: "WONT_FIX",
    REJECTED: "REJECTED",
    DUPLICATE: "DUPLICATE",
    COMPLETED: "COMPLETED"
};

const definition: ICommand = {
    // Define the command data
    data: new SlashCommandBuilder()
        .setName('issue')
        .setDescription('Create a new issue thread')
        .addStringOption(option => option
            .setName("title")
            .setDescription("A short title of the issue you want to report")),
    // The execution method for this command
    async execute(interaction: CommandInteraction) {
        // If someone attempts to call us in a thread, we can't create another thread, so don't continue.
        if (interaction.channel.isThread() || !isChannelAllowed(interaction.guild.id, interaction.channel.id)) {
            await interaction.reply({
                content: 'Sorry, I cannot create a new issue here. Please try elsewhere.',
                ephemeral: true
            });
            return;
        }

        const botId = interaction.client.user.id;
        const userId = interaction.user.id;
        // Reply to clear the interaction, but only show the response to the user
        await interaction.reply({
            content: "One second, creating a thread for your issue.",
            ephemeral: true
        });

        // Get the options from the interaction
        let title = interaction.options.getString("title") ?? null;
        let state = title === null || title.length > 200 ? states.NEED_TITLE : states.READY_FOR_DESCRIPTION;

        // Fetch the text channel where the message was sent
        const channel = await interaction.client.channels.fetch(interaction.channelId) as BaseGuildTextChannel
        // Create a new thread in this channel. Note that we cannot create a thread on an interaction since it is not actually a message.
        const threadedChannel = await channel.threads.create({
            name: title === null ? 'Issue Thread' : `Issue thread\\: ${title}`,
            reason: `User ${interaction.user.tag} wanted to create an issue`
        });

        // Ensure we join the channel (why is this needed? not sure)
        await threadedChannel.join();
        // Force the user to join the thread
        threadedChannel.members.add(userId);

        // Get ready to read messages from thread, with a sliding expiration of 5 minutes
        const collector = threadedChannel.createMessageCollector({
            idle: 5 * 60 * 1000
        });

        interface IDescription {
            tag: string;
            message: string;
        }
        const description: Array<IDescription> = [];
        // Append the description
        function addDescription(tag: string, message: string): void {
            let fixedMessage = message.replace(/(.+)```/, (_, prefix) => [prefix, '\r\n', '```'].join(''));
            fixedMessage = message.replace(/^```(.{4,})/, (_, suffix) => ['```', '\r\n', suffix].join(''));
            description.push({ tag: tag, message: fixedMessage });
        }
        // Flatten the description into a string
        function flattenDescription(): string {
            return description.map((v, i) => {
                // If this is the first message, or the previous
                // message was not by the same person, add the tag
                if (i === 0 || description[i - 1].tag !== v.tag) {
                    return `${v.tag} says:\r\n${v.message}`
                }

                return v.message;
            }).join('\r\n');
        }
        async function completeIssue(): Promise<void> {
            state = states.PLEASE_WAIT;
            collector.stop("completed");
            const url = await createIssue(title, flattenDescription());
            await threadedChannel.send(`Issue created successfully: ${url}`);
            await closeThread();
        }
        async function closeThread(): Promise<void> {
            // Might not have lock permissions
            try { await threadedChannel.setLocked(true); }
            catch { }
            await threadedChannel.setArchived(true);
        }
        collector.on('collect', async m => {
            // Ignore our own messages in this thread
            if (m.author.id == botId) {
                return;
            }
            console.log(`${state}: Detected message in our thread: ${m.author.tag}: ${m.content}`)
            if (state === states.NEED_TITLE) {
                if (m.content.length > 200) {
                    await threadedChannel.send("Sorry, that title is too long. Please try again.");
                } else {
                    title = m.content;
                    await threadedChannel.setName(`Issue Thread\\: ${title}`);
                    await threadedChannel.send(`Got it! Now you can use this thread to enter a description of your issue. You can add code blocks by using the syntax: \\\`\\\`\\\`js\r\n\\\`\\\`\\\`\r\n\r\n Once you have entered a description, type !done to create the issue.`);
                    state = states.READY_FOR_DESCRIPTION;
                }
            } else if (state === states.READY_FOR_DESCRIPTION) {
                addDescription(m.author.tag, m.content);
                state = states.MORE_DESCRIPTION;
                // TODO: Add attachments to description as links to the Discord
                for (const key in m.attachments) {
                    const file: MessageAttachment = m.attachments[key];
                    addDescription(m.author.tag, `[attachment](${file.proxyURL})`);
                }
                await m.react("👍");
            } else if (state === states.MORE_DESCRIPTION) {
                const command = m.content.toLowerCase();
                if (command.startsWith("!")) {
                    const member = await m.guild.members.fetch(m.author.id);
                    const roles = member.roles.cache.map(r => r.id);
                    const isAdmin = isUserAdmin(m.guild.id, m.author.id, roles);
                    if (command === "!done") {
                        await m.reply("Great! Please wait while I create that issue for you.");
                        completeIssue();
                        const issueId = createIssue(title, flattenDescription());
                        console.log(issueId);
                        return;
                    }
                    if (isAdmin) {
                        if (command === "!wontfix") { // TODO: Admin users
                            await m.reply("Got it boss! Closing this thread as wontfix.");
                            state = states.WONT_FIX;
                            collector.stop();
                            return;
                        } else if (command === "!reject") {
                            await m.reply("Got it boss! Closing this thread as rejected.");
                            state = states.REJECTED;
                            collector.stop();
                            return;
                        } else if (command === "!duplicate") {
                            await m.reply("Got it boss! CLosing this thread as duplicate.");
                            state = states.DUPLICATE;
                            collector.stop();
                            return;
                        }
                    }
                }

                addDescription(m.author.tag, m.content);
                m.react("👍");
            }
        });

        collector.once('end', async () => {
            switch (state) {
                case states.PLEASE_WAIT:
                case states.COMPLETED:
                    break;
                case states.WONT_FIX:
                case states.REJECTED:
                case states.DUPLICATE:
                    await closeThread();
                    break;
                case states.MORE_DESCRIPTION:
                    await threadedChannel.send("Sorry, but it looks like you didn't finish creating the issue. I'll go ahead and create it with the description you already provided.");
                    await completeIssue();
                    break;
                default:
                    await threadedChannel.send("Sorry, but it looks like you didn't finish creating the issue. Since no description was provided, no issue was created. Please try again later.");
                    state = states.COMPLETED;
                    await closeThread();
                    break;
            }
        });

        if (state === states.NEED_TITLE) {
            threadedChannel.send(`Hello <@${userId}>, please type a short title of the issue you are having. Maximum 200 characters.`);
        } else {
            threadedChannel.send(`Hello <@${userId}>, please use this thread to enter a description of your issue. You can add code blocks by using the syntax: \r\n\\\`\\\`\\\`js\r\n\\\`\\\`\\\`. Once ready, type !done to create the issue.`);
        }
    },
};

export default definition;
