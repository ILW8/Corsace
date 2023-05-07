import { Message, EmbedBuilder, EmbedData, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { OAuth, User } from "../../../Models/user";
import { Command } from "../index";
import { User as APIUser } from "nodesu";
import { osuClient } from "../../../Server/osu";
import { loginResponse } from "../../functions/loginResponse";

async function run (m: Message | ChatInputCommandInteraction) {
    if (m instanceof ChatInputCommandInteraction)
        await m.deferReply();

    const osuRegex = /(osu|profile)\s+(.+)/i;
    const profileRegex = /(osu|old)\.ppy\.sh\/(u|users)\/(\S+)/i;

    const author = m instanceof Message ? m.author : m.user;
    let user: User;
    let apiUser: APIUser;
    if (
        (m instanceof Message && !osuRegex.test(m.content) && !profileRegex.test(m.content)) ||
        (m instanceof ChatInputCommandInteraction && !m.options.getString("user"))
    ) { // Querying themself in message command
        const userQ = await User.findOne({
            where: {
                discord: {
                    userID: author.id,
                },
            },
        });
        if (!userQ) {
            await loginResponse(m);
            return;
        }

        apiUser = (await osuClient.user.get(userQ.osu.userID)) as APIUser;
        user = userQ;
    } else { // Querying someone else
        let q = "";
        if (m instanceof Message && osuRegex.test(m.content)) { // Command run
            const res = osuRegex.exec(m.content);
            if (!res)
                return;
            q = res[2];
            apiUser = (await osuClient.user.get(res[2])) as APIUser;
        } else if (m instanceof ChatInputCommandInteraction && !profileRegex.test(m.options.getString("user")!)) { // Slash command run
            apiUser = (await osuClient.user.get(m.options.getString("user")!)) as APIUser;
        } else { // Profile linked
            const res = profileRegex.exec(m instanceof Message ? m.content : m.options.getString("user")!);
            if (!res)
                return;
            q = res[3];
            apiUser = (await osuClient.user.get(res[3])) as APIUser;
        }

        if (!apiUser) {
            if (m instanceof Message) await m.reply(`No user found for **${q}**`);
            else await m.editReply(`No user found for **${q}**`);
            return;
        }

        let userQ = await User.findOne({
            where: {
                osu: { 
                    userID: apiUser.userId.toString(), 
                },
            },
        });

        if (!userQ) {
            userQ = new User;
            userQ.country = apiUser.country.toString();
            userQ.osu = new OAuth;
            userQ.osu.userID = `${apiUser.userId}`;
            userQ.osu.username = apiUser.username;
            userQ.osu.avatar = "https://a.ppy.sh/" + apiUser.userId;
            await userQ.save();
        }
        user = userQ;
    }
    
    const embedMsg: EmbedData = {
        author: {
            url: `https://osu.ppy.sh/users/${user.osu.userID}`,
            name: `${user.osu.username} (${user.osu.userID})`,
            iconURL: `https://osu.ppy.sh/images/flags/${user.country}.png`,
        },
        description: `**PP:** ${apiUser.pp}\n **Rank:** #${apiUser.rank} (${user.country}#${apiUser.countryRank})\n **Acc:** ${apiUser.accuracy.toFixed(2)}%\n **Playcount:** ${apiUser.playcount}\n **SS**: ${apiUser.countRankSS} **S:** ${apiUser.countRankS} **A:** ${apiUser.countRankA}\n **Joined:** <t:${apiUser.joinDate.getTime() / 1000}>`,
        color: 0xFB2475,
        footer: {
            text: `Corsace ID #${user.ID}`,
        },
        thumbnail: {
            url: user.osu.avatar,
        },
    };
    const message = new EmbedBuilder(embedMsg);
    if (m instanceof Message) m.reply({ embeds: [message] });
    else m.editReply({ embeds: [message] });
}

const data = new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Obtain your or someone else's osu! profile")
    .addStringOption(option => option.setName("user").setDescription("The user to query"));

const profile: Command = {
    data, 
    alternativeNames: ["osu"],
    category: "osu",
    run,
};

export default profile;