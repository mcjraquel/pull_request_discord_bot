const { SlashCommandBuilder } = require("discord.js");
const { guildId } = require("./../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("close")
        .setDescription("Closes PR thread."),
    async execute(interaction, client) {
        const guild = client.guilds.cache.get(guildId);
        const thread_to_close = guild.channels.cache.get(interaction.channelId);
        if (!thread_to_close.isThread()) {
            await interaction.reply({
                content: "Current channel is not a thread.",
                ephemeral: true,
            });
            return;
        }

        const tags = thread_to_close.name.toLowerCase().matchAll(/\[(.*?)\]/g);
        const tags_content = Array.from(tags, (x) => x[1]);
        const is_open_thread = tags_content[0] === "open";
        if (!is_open_thread) {
            await interaction.reply({
                content: "Thread is not open.",
                ephemeral: true,
            });
            return;
        }

        thread_to_close.setName(
            thread_to_close.name.replace(/open/i, "closed")
        );
        await interaction.reply({
            content: `Thread https://discord.com/channels/${thread_to_close.guildId}/${thread_to_close.id} closed.`,
            ephemeral: true,
        });
    },
};
