import { SlashCommandBuilder } from '@discordjs/builders'
import { BaseGuildTextChannel, CommandInteraction } from 'discord.js';
import { ICommand } from '../icommand';

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
        if (interaction.channel.isThread()) {
            await interaction.reply('Sorry, I cannot create a new issue here. Please try in #bug-reports');
            return;
        }
        // TODO: Check valid channelId based on configuration

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
            description.push({ tag: tag, message: message });
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
        // Create an issue with the title and description and return the issue number
        function createIssue(title: string, description: string): number {
            // TODO: Link github here
            console.log(`Create issue ${title} with description:\r\n${description}`);
            return 1234;
        }
        collector.on('collect', m => {
            // Ignore our own messages in this thread
            if (m.author.id == botId) {
                return;
            }
            console.log(`${state}: Detected message in our thread: ${m.author.tag}: ${m.content}`)
            if (state === states.NEED_TITLE) {
                if (m.content.length > 200) {
                    threadedChannel.send("Sorry, that title is too long. Please try again.");
                } else {
                    title = m.content;
                    threadedChannel.setName(`Issue Thread\\: ${title}`);
                    threadedChannel.send(`Got it! Now you can use this thread to enter a description of your issue. You can add code blocks by using the syntax: \\\`\\\`\\\`js\r\n\\\`\\\`\\\`\r\n\r\n Once you have entered a description, type !done to create the issue.`);
                    state = states.READY_FOR_DESCRIPTION;
                }
            } else if (state === states.READY_FOR_DESCRIPTION) {
                addDescription(m.author.tag, m.content);
                // TODO: Add attachments to description as links to the Discord
                // for (const key in m.attachments) {
                //     //const file: MessageAttachment = m.attachments[key];
                //     //file.proxyURL
                // }
                m.react("👍");
                state = states.MORE_DESCRIPTION;
            } else if (state === states.MORE_DESCRIPTION) {
                const command = m.content.toLowerCase();
                if (command === "!done") {
                    m.reply("Great! Please wait while I create that issue for you.");
                    state = states.PLEASE_WAIT;
                    const issueId = createIssue(title, flattenDescription());
                    console.log(issueId);
                    return;
                } else if (command === "!wontfix") { // TODO: Admin users
                    m.reply("Got it boss! Closing this thread as wontfix.");
                    state = states.WONT_FIX;
                    collector.stop("denied");
                    return;
                } else if (command === "!reject") {
                    m.reply("Got it boss! Closing this thread as rejected.");
                    state = states.REJECTED;
                    collector.stop("denied");
                    return;
                } else if (command === "!duplicate") {
                    m.reply("Got it boss! CLosing this thread as duplicate.");
                    state = states.DUPLICATE;
                    collector.stop("denied");
                    return;
                }
                addDescription(m.author.tag, m.content);
                m.react("👍");
            }
        });

        collector.once('end', () => {
            // If we prematurely end this collector, then just archive the channel and exit.
            if (collector.endReason === "denied") {
                threadedChannel.setArchived(true);
                // Might not have lock permissions
                try { threadedChannel.setLocked(true); }
                catch { }
                return;
            }

            if (state === states.MORE_DESCRIPTION) {
                threadedChannel.send("Sorry, but it looks like you didn't finish creating the issue. I'll go ahead and create it with the description you already provided.");
                state = states.PLEASE_WAIT;
                createIssue(title, flattenDescription());
            } else if (state !== states.COMPLETED) {
            } else {
                threadedChannel.send("Sorry, but it looks like you didn't finish creating the issue. Since no description was provided, no issue was created. Please try again later.");
                state = states.COMPLETED;
                threadedChannel.setArchived(true);
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
