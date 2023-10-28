const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { guildId } = require("./../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pr")
        .setDescription("Returns open PR threads.")
        .addStringOption((option) =>
            option
                .setName("owner")
                .setDescription("Filter by owner.")
                .setRequired(false)
        ),
    async execute(interaction, client) {
        const guild = client.guilds.cache.get(guildId);
        let threads = guild.channels.cache.filter(
            (x) => x.isThread() && x.parentId == interaction.channelId
        );

        const owner = interaction.options.getString("owner");

        let color = "#ffffff";
        let title = "Currently Open PRs";

        threads = threads.filter((thread) => {
            const matches = thread.name.toLowerCase().matchAll(/\[(.*?)\]/g);
            const attributes = Array.from(matches, (x) => x[1]);
            const is_included = attributes[0] === "open";
            if (is_included) return true;
        });

        if (owner) {
            threads = threads.filter((thread) => {
                const matches = thread.name
                    .toLowerCase()
                    .matchAll(/\[(.*?)\]/g);
                const attributes = Array.from(matches, (x) => x[1]);
                const is_included =
                    attributes[0] === "open" &&
                    attributes[1] === owner.toLowerCase();
                if (is_included) return true;
            });

            color = "#8c6af1";
            title = `**${owner}**'s Open PRs`;
        }

        const embed_description = threads.size
            ? threads
                  .map(
                      (thread) =>
                          `https://discord.com/channels/${thread.guildId}/${thread.id}`
                  )
                  .join("\n\n")
            : "No open PRs at the moment.";

        try {
            const messageEmbed = await new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(embed_description);
            await interaction.reply({
                embeds: [messageEmbed],
                ephemeral: true,
            });
        } catch (e) {
            interaction.reply({ content: "ERROR", ephemeral: true });
        }
    },
};
