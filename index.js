import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, PollVote, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";
import { mathSolver } from './function/mathsolver.js';
import { getCurrentDay, getNextDay, getSpecifiedDay } from './function/jadwalfinder.js';
import { saveChatLog, readLastChatLog } from './function/chats.js';
import { getLastMediaData, saveMedia } from './function/media.js';

let started = false;
let uptime;
let fallbackOn = false;
let lastDeletedMsg = { notifyName: null, msg: null };

const cli = new Client({
    restartOnAuthFail: true,
    webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html",
    },
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
        ],
    },
    authStrategy: new LocalAuth(),
});

// Utility to reply with fallback message
const sendFallbackMessage = (msg) => {
    const fallbackMessage = `> Fallback Triggered \n \n _User :_ ${lastDeletedMsg.notifyName} \n _Message:_ { ${lastDeletedMsg.msg} }`;
    msg.reply(fallbackMessage);
};

const handleCommandReplies = (msg, command, data) => {
    if (commandReplies[command]) {
        msg.reply(commandReplies[command](data));
    }
};

// CLI Event Handlers
cli.on('qr', (qr) => {
    if (!started) {
        qrcode.generate(qr, { small: true });
        started = true;
    }
    console.log("Running...");
});

cli.on('ready', () => {
    console.log('CLI is ready!');
    uptime = Math.floor(Date.now() / 1000);
    console.log(`Current Uptime TS: ${uptime}`);
});

cli.on('message', async (msg) => {
    console.log(`MSG TS: ${msg.timestamp}`);

    if (msg.timestamp - uptime <= 5) return;

    console.log("Received Message Object:", JSON.stringify(msg, null, 2));

    const chat = await msg.getChat();
    const data = msg.body.trim();
    const res = data.split(' ');
    const command = res[0];

    console.log(`Received msg body: ${msg.body}`);

    if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        saveMedia(media);
    }

    const saveDat = {
        userName: msg._data.notifyName,
        number: msg.author,
        content: data,
    };

    if (chat.isGroup) {
        console.log('This message is from a group.');

        const mentions = await msg.getMentions();
        if (mentions.length > 0) {
            console.log('Mentions:', mentions);
        }

        switch (command) {
            case ',get':
                if (whiteList[msg.author]) {
                    if (msg.hasQuotedMsg) {
                        const qlines = msg._data.quotedMsg.body.split('\n');
                        if (qlines[3]?.match(/-?\d+\s[÷×+\-*/]\s-?\d+/)) {
                            const ans = mathSolver(qlines[3]);
                            msg.reply(`${ans.answer} /x`);
                        } else {
                            msg.reply("> Automated Answer \n \n _No valid math question detected._");
                        }
                    } else {
                        msg.reply("> Automated Answer \n \n _No quoted message found or quoted message body is missing._");
                    }
                } else {
                    msg.reply("> Automated Answer \n \n _You do not have access to this feature._ \n *Sike.*");
                }
                break;

            case ',m':
                let text = '';
                const mentioned = chat.participants.map(p => {
                    text += `@${p.id.user} `;
                    return `${p.id.user}@c.us`;
                });
                await chat.sendMessage(text, { mentions: mentioned });
                break;

            case ',suit':
                if (whiteList[msg.author]) {
                    const numAuthor = msg.author.split('@')[0];
                    const cus = `${numAuthor}@c.us`;
                    const cmd = `.suit @${numAuthor}`;
                    await chat.sendMessage(cmd, { mentions: [cus] });
                } else {
                    msg.reply("> Automated Answer \n \n _You do not have access to this feature._ \n \n *Sike.*");
                }
                break;

            case ',bb':
                if (whiteList[msg.author]) {
                    const amount = Math.round(Number(res[1]));
                    if (amount > 0) {
                        chat.sendMessage(`.buylimit ${amount}`);
                    } else {
                        msg.reply("> Automated Message \n \n _Buy number cannot be less than 1_" );
                    }
                } else {
                    msg.reply("> Automated Answer \n \n _You do not have access to this feature._ \n \n *Sike.*");
                }
                break;

            case ',j':
                const curOrNext = res[1] === 'c' ? getCurrentDay(res[2])
                    : res[1] === 'n' ? getNextDay(res[2])
                        : res[1] === 's' ? getSpecifiedDay(res[3], res[2])
                            : "Invalid class.";

                if (Array.isArray(curOrNext)) {
                    msg.reply(curOrNext.length > 0 ? curOrNext.join('\n') : 'No schedule for this day.');
                } else if (curOrNext === null) {
                    msg.reply('No schedule found for the specified day.');
                } else {
                    msg.reply(curOrNext);
                }
                break;
            case ',lastmedia':
                const mediaData = getLastMediaData();
                const mediaBase64 = new MessageMedia(`${mediaData.mimetype}`, `${mediaData.data}`);
                await cli.sendMessage(msg.from, mediaBase64);
                break;
        }
    }

    handleCommandReplies(msg, command, data);

    if (command === ',fallback') {
        fallbackOn ? sendFallbackMessage(msg) : msg.reply('> Fallback is deactivated.');
    } else if (command === ',fbon' && whiteList[msg.author]) {
        fallbackOn = true;
        msg.reply('> Fallback is now activated.');
    } else if (command === ',fboff' && whiteList[msg.author]) {
        fallbackOn = false;
        msg.reply('> Fallback is now deactivated.');
    }

    saveChatLog(saveDat);
});

cli.on('message_revoke_everyone', async (message, revoked_msg) => {
    lastDeletedMsg = {
        notifyName: revoked_msg._data.notifyName,
        msg: revoked_msg._data.body,
    };
});

cli.on('vote_update', (data) => {
    console.log("Detected Poll~!", data);
});

const commandReplies = {
    ',p': () => "Pong!",
    ',help': () => "> Bot in Development \n *,credit* -> Information about this bot \n *,help* -> Command help \n *,p* -> Ping bot \n *,say <@tag> <msg>* -> Yapping",
    ',credit': () => '> Bot Information \n _Author_ : @Kyluxx && @Sam \n _Supported by_ : @wwebjs',
};

const whiteList = {
    "62895634600989@c.us": true,
    "6289666112403@c.us": true,
};

cli.initialize();
