import { ChatInputCommandInteraction, Message, SlashCommandBuilder } from "discord.js";
import { User } from "../../../Models/user";
import { Command } from "../index";

async function run (m: Message | ChatInputCommandInteraction) {
    if (m instanceof ChatInputCommandInteraction)
        await m.deferReply();
    
    // Get year and/or search query params
    let year = 0;
    let search = "";
    if (m instanceof Message) {
        const influenceRegex = /(inf|influence|influences)\s+(.+)/i;
        const res = influenceRegex.exec(m.content);
        if (!res)
            return;
        const params = res[2].split(" ");
        if (/^20[0-9]{2}$/.test(params[0])) {
            year = parseInt(params[0], 10);
            search = params.slice(1).join(" ");
        } else if (/^20[0-9]{2}$/.test(params[params.length - 1])) {
            year = parseInt(params[params.length - 1], 10);
            params.pop();
            search = params.join(" ");
        } else
            search = res[2];
    } else {
        search = m.options.getString("username") ?? "";
        year = m.options.getInteger("year") ?? 0;
        if (year < 2007)
            year = 0;
    }

    let query = await User
        .createQueryBuilder("user")
        .leftJoin("user.otherNames", "otherName")
        .leftJoinAndSelect("user.influences", "influence")
        .leftJoinAndSelect("influence.influence", "influenceUser")
        .where("influence.userID = user.ID");
    if (year >= 2007)
        query = query.andWhere("influence.year <= :year", { year });
    if (search)
        query = query.andWhere("user.osuUserid = :search", { search })
            .orWhere("user.osuUsername LIKE :user")
            .orWhere("otherName.name LIKE :user")
            .setParameter("user", `%${search}%`);
    else
        query = query.andWhere("user.discordUserid = :id", { id: m instanceof Message ? m.author.id : m.user.id });
    
    const user = await query.orderBy("influence.year", "DESC")
        .getOne();
    if (!user) {
        if (!search) {
            if (m instanceof Message) await m.reply("You either currently do not have influences for year less than equal to the provided year, or you have not logged into Corsace!\nIf you are not logged into Corsace, please login to https://corsace.io with your discord and osu! accounts in order to obtain your influences implicitly!");
            else await m.editReply("You either currently do not have influences for year less than equal to the provided year, or you have not logged into Corsace!\nIf you are not logged into Corsace, please login to https://corsace.io with your discord and osu! accounts in order to obtain your influences implicitly!");
        } else {
            if (m instanceof Message) await m.reply(`${search} does not currently contain influences found in the corsace database with the given year!`);
            else await m.editReply(`${search} does not currently contain influences found in the corsace database with the given year!`);
        }
        return;
    }
    const latestYear = Math.max(...user.influences.map(inf => inf.year));
    const influences = user.influences.filter(inf => inf.year === latestYear).sort((a, b) => a.rank - b.rank);
    if (m instanceof Message) await m.reply(`Mapping influences for **${user.osu.username} (${latestYear}):**\n${influences.map(inf => `${inf.rank}: **${inf.influence.osu.username}** ${inf.comment ? " - " + inf.comment : ""}`).join("\n")}`);
    else await m.editReply(`Mapping influences for **${user.osu.username} (${latestYear}):**\n${influences.map(inf => `${inf.rank}: **${inf.influence.osu.username}** ${inf.comment ? " - " + inf.comment : ""}`).join("\n")}`);
    return;
    
}

const data = new SlashCommandBuilder()
    .setName("influence")
    .setDescription("Show your mapping influences or someone else's given a username and a year")
    .addStringOption(option => option.setName("username").setDescription("The osu! username to search for influences for"))
    .addIntegerOption(option => option.setName("year").setDescription("The year to search for influences for").setMinValue(2007));

const influence: Command = {
    data, 
    alternativeNames: ["inf", "influences"],
    category: "osu",
    run,
};

export default influence;