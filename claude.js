import pkg from 'whatsapp-web.js';
const { Client, Location, Poll, List, Buttons, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";

// Import custom functions
import { mathSolver } from './function/mathsolver.js';
import { getCurrentDay, getNextDay, getSpecifiedDay } from './function/jadwalfinder.js';
import { saveChatLog, readLastChatLog } from './function/chats.js';
import { getLastMediaData, saveMedia } from './function/media.js';

// Permission management
const permissions = {
    superAdmin: {
        "62895634600989@c.us": true  // Super admin access
    },
    admin: {
        "6289666112403@c.us": true   // Admin access
    }
};

// Helper function to check permissions
const checkPermission = (userId, level) => {
    if (level === 'superAdmin') return permissions.superAdmin[userId];
    if (level === 'admin') return permissions.superAdmin[userId] || permissions.admin[userId];
    return false;
};

// State management
const state = {
    started: false,
    uptime: null,
    fallbackOn: false,
    lastDeletedMsg: { notifyName: null, msg: null },
    savemsg: false,
    autotrigger: false,
    waitingQuestion: false,
    atChat: null,
    inter: null
};

// Command documentation for help
const commandDocs = {
    general: [
        { cmd: ',p', desc: 'Ping bot' },
        { cmd: ',help', desc: 'Show command list' },
        { cmd: ',j <type> <class>', desc: 'Get schedule', 
          options: [
              'c : Current day',
              'n : Next day',
              's : Specified day'
          ]
        }
    ],
    admin: [
        { cmd: ',fbon', desc: 'Enable fallback message tracking' },
        { cmd: ',fboff', desc: 'Disable fallback message tracking' },
        { cmd: ',savemdaton', desc: 'Enable message data saving' },
        { cmd: ',savemdatoff', desc: 'Disable message data saving' }
    ]
};

// Generate help message
const generateHelp = () => {
    let help = '➤──────────「 *Help Menu* 」──────────➤\n\n';
    
    help += '📌 General Commands:\n';
    commandDocs.general.forEach(cmd => {
        help += `▶ ${cmd.cmd} : ${cmd.desc}\n`;
        if (cmd.options) {
            help += '   <type> Options:\n';
            cmd.options.forEach(opt => help += `   - ${opt}\n`);
        }
    });

    help += '\n📌 Admin Commands:\n';
    commandDocs.admin.forEach(cmd => {
        help += `▶ ${cmd.cmd} : ${cmd.desc}\n`;
    });

    help += '\n➤──────────────────────────────────➤';
    return help;
};

// Client initialization with merged configurations
const client = new Client({
    restartOnAuthFail: true,
    authStrategy: new LocalAuth(),
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
    }
});

// Utility functions
const sendFallbackMessage = async (msg) => {
    if (!state.lastDeletedMsg.msg) return;
    const fallbackMessage = `> Fallback Triggered \n\n_User:_ ${state.lastDeletedMsg.notifyName}\n_Message:_ { ${state.lastDeletedMsg.msg} }`;
    await msg.reply(fallbackMessage);
};

// Message command handlers
const handleGroupCommands = async (msg, command, chat) => {
    const res = msg.body.trim().split(' ');

    switch (command) {
        case ',get':
            if (!checkPermission(msg.author, 'admin')) {
                await msg.reply("> Automated Answer \n\n_You do not have access to this feature._");
                return;
            }
            if (msg.hasQuotedMsg) {
                const qlines = msg._data.quotedMsg.body.split('\n');
                if (qlines[3]?.match(/-?\d+\s[÷×+\-*/]\s-?\d+/)) {
                    const ans = mathSolver(qlines[3]);
                    await client.sendMessage(msg.author, `${ans.answer}`);
                } else {
                    await msg.reply("> Automated Answer \n\n_No valid math question detected._");
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

        // Media handling commands
        case ',lastmedia':
            if (!checkPermission(msg.author, 'admin')) return;
            const mediaData = getLastMediaData();
            if (!mediaData) {
                await msg.reply('No media data found.');
                return;
            }
            const mediaBase64 = new MessageMedia(mediaData.mimetype, mediaData.data);
            await client.sendMessage(
                msg.from, 
                mediaBase64, 
                {   
                    isViewOnce: (res[1] === 'vo'),
                    caption: (res[1] === 'vo' ? res[2] || null : res[1] || null),
                    sendMediaAsSticker: (res[1] === 's')
                }
            );
            break;
        case ',help':
            await client.sendMessage(msg.from, `${generateHelp()}`);
            break;

        // Other group commands...
    }
};

// Event Handlers
client.on('qr', (qr) => {
    if (!state.started) {
        qrcode.generate(qr, { small: true });
        state.started = true;
    }
    console.log("Running...");
});

client.on('ready', () => {
    console.log('Client is ready!');
    state.uptime = Math.floor(Date.now() / 1000);
    console.log(`Current Uptime TS: ${state.uptime}`);
});

client.on('message', async (msg) => {
    try {
        if (msg.timestamp - state.uptime <= 5) return;

        const chat = await msg.getChat();
        const data = msg.body.trim();
        const command = data.split(' ')[0];

        console.log(`Received message: ${msg.body}`);

        // Handle group messages
        if (chat.isGroup) {
            await handleGroupCommands(msg, command, chat);
        }

        // Handle admin commands
        if (checkPermission(msg.author, 'admin')) {
            switch (command) {
                case ',fbon':
                    state.fallbackOn = true;
                    await msg.reply('> Fallback is now activated.');
                    break;
                case ',fboff':
                    state.fallbackOn = false;
                    await msg.reply('> Fallback is now deactivated.');
                    break;
                case ',savemdaton':
                    state.savemsg = true;
                    await msg.reply('> Save msg data is now on.');
                    break;
                case ',savemdatoff':
                    state.savemsg = false;
                    await msg.reply('> Save msg data is now off.');
                    break;
            }
        }

        // Handle fallback request
        if (command === ',fallback') {
            state.fallbackOn ? await sendFallbackMessage(msg) : await msg.reply('> Fallback is deactivated.');
        }

        // Save message if enabled
        if (state.savemsg) {
            const saveDat = {
                userName: msg._data.notifyName,
                number: msg.author,
                content: data,
            };
            saveChatLog(saveDat);
        }

    } catch (error) {
        console.error('Message handler error:', error);
        await msg.reply("_Something went wrong..._\n_Check manual logs for details._");
    }
});

// Preserved example features (commented)
/* Original message_revoke_everyone handler
client.on('message_revoke_everyone', async (after, before) => {
    console.log(after); 
    if (before) {
        console.log(before);
    }
});
*/

/* Original group_join handler
client.on('group_join', (notification) => {
    console.log('join', notification);
    notification.reply('User joined.');
});
*/

// Active event handlers
client.on('message_revoke_everyone', async (message, revoked_msg) => {
    state.lastDeletedMsg = {
        notifyName: revoked_msg._data.notifyName,
        msg: revoked_msg._data.body,
    };
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    state.started = false;
});

// Initialize client
client.initialize();

export default client;