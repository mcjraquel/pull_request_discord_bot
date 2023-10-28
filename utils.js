function getGithubLinks(text) {
    return (
        text.match(
            /https?:\/\/(www\.)?github\.com\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\/pull\/[0-9]+/g
        ) || []
    );
}

function formatReviewTable(reviews) {
    const title = `| ${"-".repeat(19)} PULL REQUEST REVIEW STATUS ${"-".repeat(
        19
    )} |`;
    const header = `| ${"Pull Request".padEnd(25)} | ${"Approvals".padEnd(
        15
    )} | ${"Requested Changes".padEnd(20)} |`;
    const separator = `| ${"-".repeat(25)} | ${"-".repeat(15)} | ${"-".repeat(
        20
    )} |`;
    const rows = reviews.map((review) => {
        const repo = review.pullRequestLink.split("/")[4];
        const pull_number = review.pullRequestLink.split("/")[6];
        const pull_request = `${repo} ${pull_number}`;
        return `| ${pull_request.padEnd(25)} | ${review.approvals
            .toString()
            .padEnd(15)} | ${review.requested_changes.toString().padEnd(20)} |`;
    });

    return `\`\`\`${[title, header, separator, ...rows].join("\n")}\`\`\``;
}

module.exports = { getGithubLinks, formatReviewTable };
