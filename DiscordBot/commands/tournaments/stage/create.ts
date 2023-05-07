import { ChatInputCommandInteraction, EmbedBuilder, Message, PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../..";
import { profanityFilter } from "../../../../Interfaces/comment";
import { Round } from "../../../../Models/tournaments/round";
import { ScoringMethod, Stage, StageType } from "../../../../Models/tournaments/stage";
import { TournamentStatus } from "../../../../Models/tournaments/tournament";
import { fetchTournament } from "../../../functions/tournamentFunctions";
import { User } from "../../../../Models/user";
import { loginResponse } from "../../../functions/loginResponse";

async function run (m: Message | ChatInputCommandInteraction) {
    if (!m.guild || !(m.member!.permissions as Readonly<PermissionsBitField>).has(PermissionFlagsBits.Administrator))
        return;

    if (m instanceof ChatInputCommandInteraction)
        await m.deferReply();

    const nameRegex = new RegExp(/-n ([a-zA-Z0-9_ ]{3,48})/);
    const abbreviationRegex = new RegExp(/-a ([a-zA-Z0-9_]{1,8})/);
    const dateRegex = new RegExp(/-d (\d{4}-\d{2}-\d{2}) (\d{4}-\d{2}-\d{2})/);
    const typeRegex = new RegExp(/-t ([a-zA-Z0-9_ ]{4,20})/);
    const scoringRegex = new RegExp(/-s ([a-zA-Z0-9_ ]{4,20})/);
    const teamCountRegex = new RegExp(/-tc (\d{1,2}) (\d{1,2})/);
    const helpRegex = new RegExp(/-h/);
    if (m instanceof Message && (helpRegex.test(m.content) || (!nameRegex.test(m.content) && !abbreviationRegex.test(m.content) && !dateRegex.test(m.content) && !typeRegex.test(m.content) && !scoringRegex.test(m.content) && !teamCountRegex.test(m.content)))) {
        await m.reply(`Please provide all required parameters! Here is a list of them:\n**Name:** \`-n <name>\`\n**Abbreviation:** \`-a <abbreviation>\`\n**Date:** \`-d <start date> <end date>\`\n**Type:** \`-t <type>\`\n**Scoring Method:** \`-s <scoring method>\`\n**Team Count:** \`-tc <min> <max>\`\n\nIt is recommended to use slash commands for any \`create\` command.`);
        return;
    }

    const tournament = await fetchTournament(m, [TournamentStatus.NotStarted, TournamentStatus.Registrations], true, true);
    if (!tournament) 
        return;

    // Check for name validity
    const name = m instanceof Message ? nameRegex.exec(m.content)?.[1] : m.options.getString("name");
    if (!name) {
        if (m instanceof Message) await m.reply("Please provide a valid name for your stage! You are only allowed the following characters: a-z, A-Z, 0-9, _, and spaces. The name must be between 3 and 50 characters long.");
        else await m.editReply("Please provide a valid name for your stage! You are only allowed the following characters: a-z, A-Z, 0-9, _, and spaces. The name must be between 3 and 48 characters long.");
        return;
    }
    if (profanityFilter.test(name)) {
        if (m instanceof Message) await m.reply("LMFAO! XD Shut the fuck up and give a valid name you fucking idiot (Nobody's laughing with you, fucking dumbass)");
        else await m.editReply("LMFAO! XD Shut the fuck up and give a valid name you fucking idiot (Nobody's laughing with you, fucking dumbass)");
        return;
    }

    if (tournament.stages.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        if (m instanceof Message) await m.reply("A stage with that name already exists.");
        else await m.editReply("A stage with that name already exists.");
        return;
    }

    const creator = await User.findOne({
        where: {
            discord: {
                userID: m instanceof Message ? m.author.id : m.user.id,
            },
        },
    });
    if (!creator) {
        await loginResponse(m);
        return;
    }

    const stage = new Stage();
    stage.tournament = tournament;
    stage.createdBy = creator;
    stage.name = name;

    // Check for abbreviation validity
    const abbreviation = m instanceof Message ? abbreviationRegex.exec(m.content)?.[1] : m.options.getString("abbreviation");
    if (!abbreviation) {
        if (m instanceof Message) await m.reply("Please provide a valid abbreviation for your stage! You are only allowed the following characters: a-z, A-Z, 0-9, and _. The abbreviation must be between 1 and 8 characters long.");
        else await m.editReply("Please provide a valid abbreviation for your stage! You are only allowed the following characters: a-z, A-Z, 0-9, and _. The abbreviation must be between 1 and 8 characters long.");
        return;
    }
    if (tournament.stages.find(s => s.abbreviation.toLowerCase() === abbreviation.toLowerCase())) {
        if (m instanceof Message) await m.reply("A stage with that abbreviation already exists.");
        else await m.editReply("A stage with that abbreviation already exists.");
        return;
    }
    if (profanityFilter.test(abbreviation)) {
        if (m instanceof Message) await m.reply("The abbreviation is sus . Change it to something more appropriate.");
        else await m.editReply("The abbreviation is sus . Change it to something more appropriate.");
        return;
    }
    stage.abbreviation = abbreviation;

    // Check for stage date validity
    const startText = m instanceof Message ? dateRegex.exec(m.content)?.[1] : m.options.getString("start");
    const endText = m instanceof Message ? dateRegex.exec(m.content)?.[2] : m.options.getString("end");
    if (!startText || !endText) {
        if (m instanceof Message) await m.reply("Please provide a valid start and end date for your stage! The format is `YYYY-MM-DD` or a unix/epoch timestamp in seconds.");
        else await m.editReply("Please provide a valid start and end date for your stage! The format is `YYYY-MM-DD` or a unix/epoch timestamp in seconds.");
        return;
    }
    const start = new Date(startText.includes("-") ? startText : parseInt(startText + "000"));
    const end = new Date(endText.includes("-") ? endText : parseInt(endText + "000"));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start.getTime() > end.getTime()) {
        if (m instanceof Message) await m.reply("Invalid timespan. Please provide 2 dates in consecutive order.\n\n(e.g. `2021-01-01 2021-01-02`)");
        else await m.editReply("Invalid timespan. Please provide 2 dates in consecutive order.\n\n(e.g. `2021-01-01 2021-01-02`)");
        return;
    }
    if (start.getTime() < tournament.registrations.end.getTime() || end.getTime() < tournament.registrations.end.getTime()) {
        if (m instanceof Message) await m.reply("The stage overlaps with registrations. It's recommended to have between 2 weeks between registration end and the first stage's start in order to screen players as necessary.");
        else await m.editReply("The stage overlaps with registrations. It's recommended to have between 2 weeks between registration end and the first stage's start in order to screen players as necessary.");
        return;
    }
    let order = 1;
    for (const s of stage.tournament.stages) {
        if (
            (start.getTime() > s.timespan.start.getTime() && start.getTime() < s.timespan.end.getTime()) ||
            (end.getTime() > s.timespan.start.getTime() && end.getTime() < s.timespan.end.getTime()) ||
            start.getTime() === s.timespan.start.getTime() ||
            end.getTime() === s.timespan.end.getTime()
        ) {
            if (m instanceof Message) await m.reply("The stage's timespan overlaps with another stage.");
            else await m.editReply("The stage's timespan overlaps with another stage.");
            return;
        }

        // If the timestamp is after the stage's start, the order is increased, if the timestamp is after the stage's end, break the loop
        if (s.timespan.start.getTime() < start.getTime())
            order++;
    }

    stage.order = order;
    stage.timespan = {
        start,
        end,
    };

    // Check for type validity
    let stageType = m instanceof Message ? typeRegex.exec(m.content)?.[1] : m.options.getString("type");
    if (!stageType) {
        if (m instanceof Message) await m.reply("Please provide a valid type for your stage!");
        else await m.editReply("Please provide a valid type for your stage!");
        return;
    }
    stageType = stageType.replace(/\s/g, "").charAt(0).toUpperCase() + stageType.replace(/\s/g, "").slice(1);
    if (!StageType[stageType]) {
        if (m instanceof Message) await m.reply("Please provide a valid type for your stage!");
        else await m.editReply("Please provide a valid type for your stage!");
        return;
    }
    stage.stageType = StageType[stageType];

    // Check for scoring method validity
    let scoringMethod = m instanceof Message ? scoringRegex.exec(m.content)?.[1] : m.options.getString("scoring_method");
    if (!scoringMethod) {
        if (m instanceof Message) await m.reply("Please provide a valid scoring method for your stage!");
        else await m.editReply("Please provide a valid scoring method for your stage!");
        return;
    }
    scoringMethod = scoringMethod.replace(/\s/g, "").charAt(0).toUpperCase() + scoringMethod.replace(/\s/g, "").slice(1);
    if (ScoringMethod[scoringMethod] === undefined) {
        if (m instanceof Message) await m.reply("Please provide a valid scoring method for your stage!");
        else await m.editReply("Please provide a valid scoring method for your stage!");
        return;
    }
    stage.scoringMethod = ScoringMethod[scoringMethod];

    // Check for initial + final team count validity
    let initial: number | null = 0;
    let final: number | null = 0;
    if (m instanceof Message) {
        const initialTeamCount = teamCountRegex.exec(m.content)?.[1];
        const finalTeamCount = teamCountRegex.exec(m.content)?.[2];
        if (!initialTeamCount || !finalTeamCount) {
            await m.reply("Please provide a valid initial and final team count for your stage!");
            return;
        }
        initial = parseInt(initialTeamCount);
        final = parseInt(finalTeamCount);
    } else {
        initial = m.options.getInteger("initial");
        final = m.options.getInteger("final");
    }
    if (!initial || !final || isNaN(initial) || isNaN(final) || initial <= 0 || final <= 0 || initial < final) {
        if (m instanceof Message) await m.reply("Invalid number of teams.\nInitial number must be greater than or equal to final number.");
        else await m.editReply("Invalid number of teams.\nInitial number must be greater than or equal to final number.");
        return;
    }
    stage.initialSize = initial;
    stage.finalSize = final;

    // Generate rounds if single/double elimination
    stage.rounds = [];
    if (stage.stageType === StageType.SingleElimination || stage.stageType === StageType.DoubleElimination) {
        const rounds: Round[] = [];
        let roundSize = stage.initialSize;
        if (Math.log2(roundSize) % 1 !== 0) {
            const round = new Round();
            round.name = "Play-in";
            round.abbreviation = "PL";
            rounds.push(round);
            roundSize = Math.pow(2, Math.floor(Math.log2(roundSize)));
        }
        while (roundSize >= stage.finalSize && roundSize !== 1) {
            const round = new Round();
            if (roundSize === 8) {
                round.name = "Quarterfinals";
                round.abbreviation = "QF";
            } else if (roundSize === 4) {
                round.name = "Semifinals";
                round.abbreviation = "SF";
            } else if (roundSize === 2) {
                round.name = "Finals";
                round.abbreviation = "F";
            } else {
                round.name = `Round of ${roundSize}`;
                round.abbreviation = `RO${roundSize}`;
            }
            rounds.push(round);

            roundSize /= 2;

            if (roundSize === 1 && stage.stageType === StageType.DoubleElimination) {
                const round = new Round();
                round.name = "Grand Finals";
                round.abbreviation = "GF";
                rounds.push(round);
            }
        }
        stage.rounds = rounds;
    }

    if (m instanceof Message) m.reply("Done creating stage.");
    else await m.editReply("Done creating stage.");

    await stageDone(m, stage);
}

// Function to finish the stage creation
async function stageDone (m: Message | ChatInputCommandInteraction, stage: Stage) {
    const tournament = stage.tournament;
    await tournament.save();

    stage.tournament = tournament;
    await stage.save();

    await Promise.all(stage.rounds.map(async r => {
        r.stage = stage;
        return r.save();
    }));

    // Move later stages up in order
    const laterStages = tournament.stages.filter((s) => s.order >= stage.order);
    for (const s of laterStages) {
        if (s.order === stage.order && s.timespan.start < stage.timespan.start)
            continue;
        s.order++;
        await s.save();
    }

    if (m instanceof Message) await m.reply("Congratulations on saving your new stage for your tournament! :tada:\nHere is the stage embed:");
    else await m.editReply("Congratulations on saving your new stage for your tournament! :tada:\nHere is the stage embed:");

    const embed = new EmbedBuilder()
        .setTitle(stage.name)
        .setDescription(`<t:${stage.timespan.start.getTime() / 1000}> - <t:${stage.timespan.end.getTime() / 1000}>`)
        .addFields(
            { name: "Stage ID", value: stage.ID.toString(), inline: true },
            { name: "Stage Type", value: StageType[stage.stageType], inline: true },
            { name: "Tournament", value: stage.tournament.name, inline: true },
            { name: "Scoring Method", value: ScoringMethod[stage.scoringMethod], inline: true },
            { name: "Stage Position/Order", value: stage.order.toString(), inline: true },
            { name: "# of Rounds", value: stage.rounds.length.toString(), inline: true },
            { name: "Initial → Final Team Count", value: stage.initialSize + " → " + stage.finalSize, inline: true }
        )
        .setTimestamp(new Date)
        .setAuthor({ name: m instanceof Message ? m.author.tag : m.user.tag, iconURL: (m instanceof Message ? m.author : m.user).avatarURL() ?? undefined });

    await m.channel!.send({ embeds: [embed] });
}

const data = new SlashCommandBuilder()
    .setName("stage_create")
    .setDescription("Create a stage for a tournament.")
    .addStringOption((option) =>
        option.setName("name")
            .setDescription("The name of the stage.")
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(48))
    .addStringOption((option) =>
        option.setName("abbreviation")
            .setDescription("The abbreviation of the stage.")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(8))
    .addStringOption((option) =>
        option.setName("type")
            .setDescription("The type of the stage.")
            .addChoices(
                {
                    name: "Single Elimination",
                    value: "SingleElimination",
                },
                {
                    name: "Double Elimination",
                    value: "DoubleElimination",
                },
                {
                    name: "Round Robin",
                    value: "RoundRobin",
                },
                {
                    name: "Swiss",
                    value: "Swiss",
                })
            .setRequired(true))
    .addStringOption((option) =>
        option.setName("start")
            .setDescription("The start date of the stage in YYYY-MM-DD (e.g. 2024-01-01) OR unix/epoch (e.g. 1704092400)")
            .setRequired(true))
    .addStringOption((option) =>
        option.setName("end")
            .setDescription("The end date of the stage in YYYY-MM-DD (e.g. 2024-01-02) OR unix/epoch (e.g. 1704178800)")
            .setRequired(true))
    .addStringOption((option) =>
        option.setName("scoring_method")
            .setDescription("The scoring method of the stage.")
            .addChoices(
                {
                    name: "Score V1",
                    value: "ScoreV1",
                },
                {
                    name: "Score V2",
                    value: "ScoreV2",
                },
                {
                    name: "Accuracy",
                    value: "Accuracy",
                },
                {
                    name: "Combo",
                    value: "Combo",
                },
                {
                    name: "300 Counts",
                    value: "Count300",
                },
                {
                    name: "100 Counts",
                    value: "Count100",
                },
                {
                    name: "50 Counts",
                    value: "Count50",
                },
                {
                    name: "Miss Counts",
                    value: "CountMiss",
                })
            .setRequired(true))
    .addIntegerOption((option) =>
        option.setName("initial")
            .setDescription("The initial number of teams in the stage.")
            .setRequired(true))
    .addIntegerOption((option) =>
        option.setName("final")
            .setDescription("The final number of teams in the stage.")
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

const stageCreate: Command = {
    data,
    alternativeNames: ["create_stage", "create-stage","creates", "screate", "stagec", "cstage", "stage-create", "stagecreate", "createstage"],
    category: "tournaments",
    subCategory: "stages",
    run,
};
    
export default stageCreate;