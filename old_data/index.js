import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, PollVote, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";
import { mathSolver } from '../function/mathsolver.js';
import { getCurrentDay, getNextDay, getSpecifiedDay } from '../function/jadwalfinder.js';
import { saveChatLog, readLastChatLog } from '../function/chats.js';
import { getLastMediaData, saveMedia } from '../function/media.js';

let started = false;
let uptime;
let fallbackOn = false;
let lastDeletedMsg = { notifyName: null, msg: null };
let savemsg = false;
let autotrigger = false;
let waitingQuestion = false;
let atChat;
let inter;

const cli = new Client({
    restartOnAuthFail: true,
    /*webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1019422050-alpha.html",
      },*/
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

/*
const cli = new Client({
    restartOnAuthFail: true,
    
    webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1019422050-alpha.html",
    },
    
    puppeteer: {
        //headless: false,
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
        
        //executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    },
    authStrategy: new LocalAuth(),
});
*/

// Utility to reply with fallback message
const sendFallbackMessage = async (msg) => {
    const fallbackMessage = `> Fallback Triggered \n \n _User :_ ${lastDeletedMsg.notifyName} \n _Message:_ { ${lastDeletedMsg.msg} }`;
    await msg.reply(fallbackMessage);
};

const handleCommandReplies = async (msg, command, data, chat) => {
    if (commandReplies[command]) {
        await msg.reply(commandReplies[command](data));
    }
};

// CLI Event Handlers
let pairingCodeRequested = false;
cli.on('qr', async (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);

    // paiuting code example
    const pairingCodeEnabled = true;
    if (pairingCodeEnabled && !pairingCodeRequested) {
        const pairingCode = await cli.requestPairingCode('6285715377912'); // enter the target phone number
        console.log('Pairing code enabled, code: '+ pairingCode);
        pairingCodeRequested = true;
    }
});

cli.on('ready', () => {
    console.log('CLI is ready!');
    uptime = Math.floor(Date.now() / 1000);
    console.log(`Current Uptime TS: ${uptime}`);
});

cli.on('message', async (msg) => {
    try {
        console.log(`MSG TS: ${msg.timestamp}`);

        if (msg.timestamp - uptime <= 5) return;
    
        //console.log("Received Message Object:", JSON.stringify(msg, null, 2));
    
        const chat = await msg.getChat();
        console.log("================================== \n", chat, "================================== \n", '\n \n \n', "================================== \n", msg, "================================== \n");
        const data = msg.body.trim();
        const res = data.split(' ');
        const command = res[0];
    
        console.log(`Received msg body: ${msg.body}`);
    
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
                                await cli.sendMessage(msg.author, `${ans.answer}`);
                            } else {
                                await msg.reply("> Automated Answer \n \n _No valid math question detected._");
                            }
                        } else {
                            await msg.reply("> Automated Answer \n \n _No quoted message found or quoted message body is missing._");
                        }
                    } else {
                        await msg.reply("> Automated Answer \n \n _You do not have access to this feature._ \n *Sike.*");
                    }
                    break;
    
                case ',@e':
                    if(whiteList[msg.author]){
                        let text = '';
                        const mentioned = chat.participants.map(p => {
                            text += `@${p.id.user} `;
                            return `${p.id.user}@c.us`;
                        });
                        await chat.sendMessage(text, { mentions: mentioned });
                    }
                    break;
    
                case ',suit':
                    if (whiteList[msg.author]) {
                        const numAuthor = msg.author.split('@')[0];
                        const cus = `${numAuthor}@c.us`;
                        const cmd = `.suit @${numAuthor}`;
                        await chat.sendMessage(cmd, { mentions: [cus] });
                    } 
                    break;
    
                case ',bb':
                    if (whiteList[msg.author]) {
                        const amount = Math.round(Number(res[1]));
                        if (amount > 0) {
                            chat.sendMessage(`.buylimit ${amount}`);
                        } else {
                            await msg.reply("> Automated Message \n \n _Buy number cannot be less than 1_" );
                        }
                    } 
                    break;
    
                case ',j':
                    const curOrNext = res[1] === 'c' ? getCurrentDay(res[2])
                        : res[1] === 'n' ? getNextDay(res[2])
                            : res[1] === 's' ? getSpecifiedDay(res[3], res[2])
                                : "Invalid class.";
    
                    if (Array.isArray(curOrNext)) {
                        await msg.reply(curOrNext.length > 0 ? curOrNext.join('\n') : 'No schedule for this day.');
                    } else if (curOrNext === null) {
                        await msg.reply('No schedule found for the specified day.');
                    } else {
                        await msg.reply(curOrNext);
                    }
                    break;
                case ',lastmedia':
                    if(whiteList[msg.author]){
                        const mediaData = getLastMediaData();
                        const mediaBase64 = new MessageMedia(`${mediaData.mimetype}`, `${mediaData.data}`);
                        await cli.sendMessage(
                            msg.from, 
                            mediaBase64, 
                            {   
                                isViewOnce: (res[1] ? res[1] === 'vo' ? true : false : false),
                                caption: (res[1] ? res[1] === 'vo' ? res[2] ? res[2] : null : res[1] : null),
                                sendMediaAsSticker: (res[1] ? res[1] === 's' ? true : false : false),
                            });
                    }
                    break;
                case ',s':
                    if(whiteList[msg.author]){
                        console.log(msg.hasMedia);
                        if(msg.hasMedia){
                            const mediaData = await msg.downloadMedia();
                            const mediaBase64 = new MessageMedia(`${mediaData.mimetype}`, `${mediaData.data}`);
                            await cli.sendMessage(
                                msg.from, 
                                mediaBase64, 
                                {   
                                sendMediaAsSticker: true,
                                });
                        }
                    }
                    break;
                case ',svmedia':
                    if(whiteList[msg.author]){
                        if (msg.hasMedia) {
                            const media = await msg.downloadMedia();
                            saveMedia(media);
                        }else{
                            await msg.reply("No media found.");
                        }
                    }
                    break;
                case ',startm':
                    if(whiteList[msg.author]){
                        atChat = msg.from;
                        inter = setInterval(async () => {
                            if(!waitingQuestion){
                                waitingQuestion = true;
                                await cli.sendMessage(atChat,".math impossible");
                            }
                        }, 1000);
                    }
                    break;
                case ',stopm':
                    if(whiteList[msg.author]){
                        clearInterval(inter);
                    }
                    break;
                case ',g':
                    if(whiteList[msg.author]){
                        let formatText =
`> Group Information \n
_Group name:_ ${chat.groupMetadata.subject}
_Created By:_ @${chat.groupMetadata.owner?.user ||  chat.groupMetadata.descOwner?.user}
_Created at:_ ${new Date(chat.groupMetadata.creation * 1000).toLocaleString("id-ID", {
timeZone: "Asia/Jakarta",
})}
_Total member:_ ${chat.groupMetadata.size}`;    
                          await msg.reply(formatText);
                    }
                    break;
            }
        }
    
        handleCommandReplies(msg, command, data, chat);
    
        if (command === ',fallback') {
            fallbackOn ? sendFallbackMessage(msg) : await msg.reply('> Fallback is deactivated.');
        } else if (command === ',fbon' && whiteList[msg.author]) {
            fallbackOn = true;
            await msg.reply('> Fallback is now activated.');
        } else if (command === ',fboff' && whiteList[msg.author]) {
            fallbackOn = false;
            await msg.reply('> Fallback is now deactivated.');
        }
    
        if(command === ',savemdaton' && whiteList[msg.author]){
            savemsg = true;
            await msg.reply('> Save msg data is now on.');
        }else if(command === ',savemdatoff' && whiteList[msg.author]){
            savemsg = false;
            await msg.reply('> Save msg data is now off.');
        }
    
    
    
        
        if(waitingQuestion === true){
            const qlines = msg._data.body?.split('\n');
            console.log(qlines);
            if (qlines != undefined) {
                if(qlines[3]?.match(/-?\d+\s[÷×+\-*/]\s-?\d+/)){
                    const ans = mathSolver(qlines[3]);
                    setTimeout(async () => {await msg.reply(`${ans.answer}`); setTimeout(() => {waitingQuestion = false}, 2500);}, 5000);
                }else if(qlines[0] === 'Maaf limit harian kamu sudah habis, beli premium untuk mendapatkan limit Unlimited, atau kamu dapat menunggu reset limit pada pukul 05.05 setiap harinya'){
                    setTimeout(async () => {await msg.reply(`.buylimit 30`); setTimeout(() => {waitingQuestion = false}, 1500)}, 2000);
                }else if(qlines[0] === 'Masih ada game yang blum kamu selesaikan'){
                    setTimeout(() => {waitingQuestion = false}, 2000);
                }
            }
        }else if(command === ',savemdatoff' && whiteList[msg.author]){
            savemsg = false;
            await msg.reply('> Save msg data is now off.');
        }
    
        if(savemsg === true){
            const saveDat = {
                userName: msg._data.notifyName,
                number: msg.author,
                content: data,
            };
            saveChatLog(saveDat);
        }
    } catch (error) {
        await msg.reply("_Something goes wrong..._ \n _check manual logs for details._");
        console.log(error);
    }
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
    ',help': () => "> Bot in Development \n *,credit* -> Information about this bot \n *,help* -> Command help \n *,p* -> Ping bot \n \n> Authorized CMD \n _Hidden for now._",
    ',credit': () => '> Bot Information \n _Author_ : @Kyluxx && @Sam \n _Supported by_ : @wwebjs',
    'Silahkan': (chat) => {
        if(!chat.isGroup){return "gunting"}
    },
};

const whiteList = {
    "62895634600989@c.us": true,
    //"6289666112403@c.us": true,
};

cli.initialize();
