const { SlashCommandBuilder } = require("discord.js");
const { guildId, octokitToken } = require("../config.json");
const { Octokit } = require("octokit");
const { getGithubLinks, formatReviewTable } = require("../utils");

const octokit = new Octokit({
    auth: octokitToken,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Fetches the updated review status of PRs."),
    async execute(interaction, client) {
        const guild = client.guilds.cache.get(guildId);
        const currentThread = guild.channels.cache.get(interaction.channelId);
        if (currentThread.isThread()) {
            const tags = currentThread.name
                .toLowerCase()
                .matchAll(/\[(.*?)\]/g);
            const tags_content = Array.from(tags, (x) => x[1]);
            const is_open_thread = tags_content[0] === "open";
            if (is_open_thread) {
                let currentThreadPullRequestLinks = [];
                const currentThreadMessages =
                    await currentThread.messages.fetch();
                for (msg of currentThreadMessages.values()) {
                    if (msg.author.bot) {
                        if (msg.content.includes("PULL REQUEST REVIEW STATUS"))
                            await msg.delete();
                        else continue;
                    } else {
                        currentThreadPullRequestLinks = new Set([
                            ...currentThreadPullRequestLinks,
                            ...getGithubLinks(msg.content),
                        ]);
                    }
                }

                const pullRequestReviews = [];

                for (const pullRequestLink of currentThreadPullRequestLinks) {
                    const owner = pullRequestLink.split("/")[3];
                    const repo = pullRequestLink.split("/")[4];
                    const pullRequestNumber = pullRequestLink.split("/")[6];
                    const pullReviewsResponse = await octokit.request(
                        "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
                        {
                            owner: owner,
                            repo: repo,
                            pull_number: pullRequestNumber,
                            headers: {
                                "x-github-api-version": "2022-11-28",
                            },
                        }
                    );

                    const approvals = (
                        pullReviewsResponse.data.filter(
                            (review) => review.state === "APPROVED"
                        ) || []
                    ).length;
                    const requested_changes = (
                        pullReviewsResponse.data.filter(
                            (review) => review.state === "CHANGES_REQUESTED"
                        ) || []
                    ).length;

                    pullRequestReviews.push({
                        pullRequestLink,
                        approvals,
                        requested_changes,
                    });
                }

                const pullRequestReviewData =
                    formatReviewTable(pullRequestReviews);
                await interaction.reply({
                    content: pullRequestReviewData,
                });
            }
        }
    },
};
