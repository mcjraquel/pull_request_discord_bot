const fs = require("node:fs");
const cron = require("node-cron");
const path = require("node:path");
const { Octokit } = require("octokit");
const {
    Client,
    Events,
    Collection,
    GatewayIntentBits,
    EmbedBuilder,
} = require("discord.js");
const {
    guildId,
    discordToken,
    pullRequestChannels,
    octokitToken,
} = require("./config.json");
const { getGithubLinks } = require("./utils");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
});
const octokit = new Octokit({
    auth: octokitToken,
});

client.on(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(
            `No command matching ${interaction.commandName} was found.`
        );
        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
        });
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return false;

    const pullRequestLinks = getGithubLinks(message.content);

    for (const pullRequestLink of pullRequestLinks) {
        const owner = pullRequestLink.split("/")[3];
        const repo = pullRequestLink.split("/")[4];
        const pullRequestNumber = pullRequestLink.split("/")[6];
        try {
            const pullRequestResponse = await octokit.request(
                "GET /repos/{owner}/{repo}/pulls/{pull_number}",
                {
                    owner: owner,
                    repo: repo,
                    pull_number: pullRequestNumber,
                    headers: {
                        "x-github-api-version": "2022-11-28",
                    },
                }
            );

            const color = "#8c6af1";
            const pullRequestData = `
                **${pullRequestResponse.data.title}**
                ${pullRequestLink}

                Status: ${pullRequestResponse.data.state.toUpperCase()}
                Owner: ${pullRequestResponse.data.user.login}
                Base Branch: ${pullRequestResponse.data.base.ref}
                Head Branch: ${pullRequestResponse.data.head.ref}
            `;
            const messageEmbed = await new EmbedBuilder()
                .setColor(color)
                .setDescription(pullRequestData);
            await message.reply({
                embeds: [messageEmbed],
            });
        } catch (error) {
            if (error.response) {
                console.error(
                    `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`
                );
            }
            console.error(error);
        }
    }

    console.log(`Message from ${message.author.username}: ${message.content}`);
});

const send_open_prs = async function (pr_channel_id) {
    const guild = client.guilds.cache.get(guildId);
    const pr_channel = guild.channels.cache.get(pr_channel_id);
    const threads = guild.channels.cache.filter(
        (x) => x.isThread() && x.parentId == pr_channel_id
    );
    const open_prs = threads.filter((thread) => {
        const matches = thread.name.toLowerCase().matchAll(/\[(.*?)\]/g);
        const attributes = Array.from(matches, (x) => x[1]);
        const is_open_thread = attributes[0] === "open";
        if (is_open_thread) return true;
    });

    const color = "#ffffff";
    const title = "Currently Open PRs";
    const embed_description = open_prs
        .map(
            (thread) =>
                `https://discord.com/channels/${thread.guildId}/${thread.id}`
        )
        .join("\n\n");

    const messageEmbed = await new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(embed_description);
    await pr_channel.send({ embeds: [messageEmbed] });
};

const open_prs_task = cron.schedule("32 17 * * *", async function () {
    const pr_channel_ids = pullRequestChannels;
    const promises = [];

    for (pr_channel_id of pr_channel_ids) {
        promises.push(send_open_prs(pr_channel_id));
    }
    return Promise.all(promises);
});
open_prs_task.start();

client.login(discordToken);
