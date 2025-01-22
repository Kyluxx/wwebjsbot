import pkg from 'whatsapp-web.js';
import qrcode from "qrcode-terminal";
const { Client, Location, Poll, List, Buttons, LocalAuth, MessageMedia } = pkg;
import { extractPollOpt } from './function/createpoll.js';
import { mathSolver } from './function/mathsolver.js';
import { getCurrentDay, getNextDay, getSpecifiedDay } from './function/jadwalfinder.js';
import { saveChatLog, readLastChatLog } from './function/chats.js';
import { getLastMediaData, saveMedia } from './function/media.js';

const client = new Client({
    authStrategy: new LocalAuth(),
    // proxyAuthentication: { username: 'username', password: 'password' },
    puppeteer: { 
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
        headless: true,
    }
});

// client initialize does not finish at ready now.
client.initialize();

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

// Pairing code only needs to be requested once
let pairingCodeRequested = false;
client.on('qr', async (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
    if (!state.started) {
        qrcode.generate(qr, { small: true });
        state.started = true;
    }

    // paiuting code example
    const pairingCodeEnabled = true;
    if (pairingCodeEnabled && !pairingCodeRequested) {
        const pairingCode = await client.requestPairingCode('6285715377912'); // enter the target phone number
        console.log('Pairing code enabled, code: '+ pairingCode);
        pairingCodeRequested = true;
    }
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', async () => {
    console.log('READY');
    const debugWWebVersion = await client.getWWebVersion();
    console.log(`WWebVersion = ${debugWWebVersion}`);

    client.pupPage.on('pageerror', function(err) {
        console.log('Page error: ' + err.toString());
    });
    client.pupPage.on('error', function(err) {
        console.log('Page error: ' + err.toString());
    });
    
});

const sendFallbackMessage = async (msg) => {
    const fallbackMessage = `> Fallback Triggered \n \n _User :_ ${state.lastChat.notifyName} \n _Message:_ { ${state.lastChat.msg} }`;
    await msg.reply(fallbackMessage);
};

let state = {
    started: false,
    uptime: null,
    fallbackOn: false,
    lastChat: { notifyName: null, msg: null },
    savemsg: false,
    autotrigger: false,
    waitingQuestion: false,
    atChat: null,
    inter: null,
    pend: false,
    tfc: 0,
    waitingFor: 0,
};

const commandDocs = {
    general: [
        { cmd: ',help', desc: 'Show this help list' },
        { cmd: ',ping', desc: 'Send a ping message to the chat' },
        { cmd: ',ping reply', desc: 'Send a ping message as a reply to current message' },
        { cmd: ',sendto <number> <message>', desc: 'Send a message to a specific contact' },
        { cmd: ',echo <message>', desc: 'Bot replies with the same message' },
        { cmd: ',preview <text>', desc: 'Send a message with link preview' },
        { cmd: ',chats', desc: 'Show number of open chats' },
        { cmd: ',info', desc: 'Display connection information' },
        { cmd: ',mediainfo', desc: 'Show information about media in message' },
        { cmd: ',quoteinfo', desc: 'Display information about quoted message' },
        { cmd: ',resendmedia', desc: 'Resend media from quoted message' },
        { cmd: ',isviewonce', desc: 'Send media as view once message' },
        //{ cmd: ',location', desc: 'Send various location message examples' },
        { cmd: ',status <text>', desc: 'Update bot status message' },
        { cmd: ',reaction', desc: 'React to message with 👍' },
        { cmd: ',sendpoll <pollname> \'ma\' <pollopt> <pollopt2> <pollopt3>', desc: 'Create and send poll messages (ma: multiple answer is optional)' },
        { cmd: ',typing', desc: 'Show typing indicator in chat' },
        { cmd: ',recording', desc: 'Show recording audio indicator in chat' },
        { cmd: ',clearstate', desc: 'Clear typing/recording state' },
        { cmd: ',delete', desc: 'Delete quoted message (only own messages)' },
        { cmd: ',pin', desc: 'Pin the current chat' },
        { cmd: ',archive', desc: 'Archive the current chat' },
        { cmd: ',mute', desc: 'Mute chat for 20 seconds' },
        { cmd: ',pinmsg', desc: 'Pin message for 1 minute' },
        { cmd: ',syncHistory', desc: 'Sync chat history' },
        { cmd: ',fallback', desc: 'Get the (last) deleted chats' },
    ],
    group: [
        { cmd: ',subject <text>', desc: 'Change group subject' },
        { cmd: ',desc <text>', desc: 'Change group description' },
        { cmd: ',leave', desc: 'Leave current group' },
        { cmd: ',join <code>', desc: 'Join group via invite code' },
        //{ cmd: ',addmembers', desc: 'Add members to group' },
        //{ cmd: ',creategroup', desc: 'Create a new group' },
        { cmd: ',groupinfo', desc: 'Show group details' },
        //{ cmd: ',mentionUsers', desc: 'Mention users in message' },
        //{ cmd: ',mentionGroups', desc: 'Mention groups in message' },
        //{ cmd: ',getGroupMentions', desc: 'Get group mentions from message' },
        { cmd: ',approverequest', desc: 'Approve group join requests (not tested)' }
    ],
    /*labels: [
        { cmd: ',updatelabels', desc: 'Update chat labels' },
        { cmd: ',addlabels', desc: 'Add new labels to chat' }
    ],*/
    status: [
        { cmd: ',statuses', desc: 'Get broadcast statuses' }
    ],
    external: [
        { cmd: ',credit', desc: null },
        { cmd: ',pingms', desc: null },
        { cmd: ',get', desc: null },
        { cmd: ',@e', desc: null },
        { cmd: ',g', desc: null },
        { cmd: ',s', desc: null },
        { cmd: ',startm <m>', desc: null },
        { cmd: ',suit', desc: null },
        { cmd: ',j', desc: null },
        { cmd: ',lastmedia <vo> <capt> <s>', desc: null },
        { cmd: ',svmedia', desc: null },
        { cmd: ',bb <int>', desc: null },
        { cmd: ',tf <int>', desc: null },
        { cmd: ',grantadm <mention>', desc: null },
        { cmd: ',rmadm <mention>', desc: null },
        { cmd: ',pend', desc: null },
        { cmd: ',continue', desc: null },
    ]
};


const generateHelp = () => {
    let help = '➤──────「 *Help Menu* 」──────➤\n\n';
    
    // General commands section
    help += '📌 *General Commands:*\n';
    if (commandDocs.general) {
        commandDocs.general.forEach(cmd => {
            help += `➤ ${cmd.cmd}\n`;
        });
    }

    // Group commands section
    help += '\n📌 *Group Commands:*\n';
    if (commandDocs.group) {
        commandDocs.group.forEach(cmd => {
            help += `➤ ${cmd.cmd}\n`;
        });
    }

    // Label commands section
    /*
    help += '\n📌 Label Commands:\n';
    if (commandDocs.labels) {
        commandDocs.labels.forEach(cmd => {
            help += `▶ ${cmd.cmd} : ${cmd.desc}\n`;
        });
    }
    */

    // Status commands section
    help += '\n📌 *Status Commands:*\n';
    if (commandDocs.status) {
        commandDocs.status.forEach(cmd => {
            help += `➤ ${cmd.cmd}\n`;
        });
    }
    help += '\n📌 *External Commands:*\n';
    if (commandDocs.external) {
        commandDocs.external.forEach(cmd => {
            help += `➤ ${cmd.cmd}\n`;
        });
    }

    help += '\n➤───────────────────────➤';
    return help;
};

const generatePerm = () => {
    let help = '➤───────「 *Access* 」────────➤\n\n';
    
        // Super Admin section
        help += '📌 *Super Admin*\n';
        if (permissions.superAdmin) {
            Object.keys(permissions.superAdmin).forEach((key) => {
                help += `➤ ${key}\n`;
            });
        }
    
        // Admin section
        help += '\n📌 *Admin*\n';
        if (permissions.admin) {
            Object.keys(permissions.admin).forEach((key) => {
                help += `➤ ${key}\n`;
            });
        }

        help += '➤───────────────➤\n\n';
    
        return help;
};




// Permission management
let permissions = {
    superAdmin: {
        "62895634600989@c.us": true  // Super admin access
    },
    admin: {
        
    }
};

// Helper function to check permissions
const checkPermission = (userId, level) => {
    if (level === 'superAdmin') return permissions.superAdmin[userId];
    if (level === 'admin') return permissions.superAdmin[userId] || permissions.admin[userId];
    return false;
};



client.on('message', async msg => {
    
    if(msg.body === ',continue'){
        if(!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
            msg.reply("> Unauthorized commands");
            return;
        } 
        state.pend = false;
        msg.reply("> CMDs will be continued.");
    }

    if(state.pend) return;

    let t = Date.now();
    console.log('MESSAGE RECEIVED', msg);
    state.lastChat = msg;

    if(msg.body === ',pingms'){
        await client.sendMessage(msg.from, `Pong! [ \`MS:${Date.now()-t}\` ]`);
        return;
    }

    if(state.waitingQuestion === true){
        const qlines = msg._data.body?.split('\n');
        console.log(qlines);
        if (qlines != undefined) {
            if(qlines[3]?.match(/-?\d+\s[÷×+\-*/]\s-?\d+/)){
                const ans = mathSolver(qlines[3]);
                setTimeout(async () => {
                    await msg.reply(`${ans.answer}`); 
                    state.tfc += 1;
                    setTimeout(async() => {
                        state.waitingQuestion = false;
                        if(state.tfc > 30){
                            state.tfc = 0;  
                            await client.sendMessage(msg.author, `.tfbalance 62895634600989 5000`);
                        }
                    }, 3000);
                }, 1);
            }else if(qlines[0] === 'Maaf limit harian kamu sudah habis, beli premium untuk mendapatkan limit Unlimited, atau kamu dapat menunggu reset limit pada pukul 05.05 setiap harinya'){
                setTimeout(async () => {
                    await msg.reply(`.buylimit 30`);
                    setTimeout(async() => {state.waitingQuestion = false}, 3000);
                }, 1);
            }else if(qlines[0] === 'Masih ada game yang blum kamu selesaikan'){
                setTimeout(async () => {state.waitingQuestion = false}, 3000);
            }
        }
    }

    try {
        if (msg.body === ',ping reply') {
            // Send a new message as a reply to the current one
            await msg.reply('pong');
        } else if (msg.body === ',checkperm') {
            await client.sendMessage(msg.from, `${generatePerm()}`);
        } else if (msg.body === ',pend') {
            state.pend = true;
            await msg.reply(`> CMDs will be paused.`);
        } else if (msg.body === ',help') {
            await msg.reply(`${generateHelp()}`);
        } else if (msg.body.startsWith(',grantadm') || msg.body.startsWith(',rmadm')) {
            if(!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }  
            const mentions = await msg.getMentions(); // Array of mentioned objects
            const isGrant = msg.body.startsWith(',grantadm'); // Check if granting or removing
        
            if (mentions.length > 0) {
                const ids = mentions.map((mention) => mention.number + '@c.us'); // Extract user NUMs
                ids.forEach((id) => {
                    if (isGrant) {
                        permissions.admin[id] = true; // Grant admin access
                    } else {
                        delete permissions.admin[id]; // Remove admin access
                    }
                });
                await msg.reply(`> ${isGrant ? 'Granted' : 'Removed'} admin access for: ${ids.join(', ')}`);
            } else {
                await msg.reply(`> No mentions found. Please mention users to ${isGrant ? 'grant' : 'remove'} admin access.`);
            }
        } else if (msg.body.startsWith('Silahkan ')  && !(msg.isGroup)) {
            await client.sendMessage(msg.from, 'gunting');
        } else if (msg.body === ',credit') {
            await client.sendMessage(msg.from, `> Bot Information \n _Author_ : \`@kyluxx\` \n _Supported by_ : \`@wwebjs\``);
        } else if (msg.body === ',ping') {
            // Send a new message to the same chat
            await client.sendMessage(msg.from, 'pong');
        } else if (msg.body.startsWith(',sendto ')) {
            // Direct send a new message to specific id
            if (!(checkPermission(msg.author === undefined ? msg.from : msg.author, 'admin') || checkPermission(msg.author === undefined ? msg.from : msg.author, 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return; 
            }
            let number = msg.body.split(' ')[1];
            let messageIndex = msg.body.indexOf(number) + number.length;
            let message = msg.body.slice(messageIndex, msg.body.length);
            number = number.includes('@c.us') ? number : `${number}@c.us`;
            let chat = await msg.getChat();
            chat.sendSeen();
            await client.sendMessage(number, message);
            await msg.reply(`> Message sent successfully! \n \n _To:_ \`\`\`${number}\`\`\` \n _Msg:_ \`\`\`${message}\`\`\` `);
    
        } else if (msg.body.startsWith(',subject ')) {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }

            // Change the group subject
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newSubject = msg.body.slice(9);
                chat.setSubject(newSubject);
            } else {
                await msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body.startsWith(',echo ')) {
            // Replies with the same message
            await msg.reply(msg.body.slice(6));
        } else if (msg.body.startsWith(',preview ')) {
            const text = msg.body.slice(9);
            await msg.reply(text, null, { linkPreview: true });
        } else if (msg.body.startsWith(',desc ')) {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }   

            // Change the group description
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newDescription = msg.body.slice(6);
                chat.setDescription(newDescription);
            } else {
                await msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body === ',leave') {
            if(!checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin')){ msg.reply("> Unauthorized commands"); return; }
            // Leave the group
            let chat = await msg.getChat();
            if (chat.isGroup) {
                chat.leave();
            } else {
                await msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body.startsWith(',join ')) {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }

            const inviteCode = msg.body.split(' ')[1];
            try {
                await client.acceptInvite(inviteCode);
                await msg.reply('Joined the group!');
            } catch (e) {
                await msg.reply('That invite code seems to be invalid.');
            }
        } 
        /*
        else if (msg.body.startsWith(',addmembers')) {
            const group = await msg.getChat();
            const result = await group.addParticipants(['number1@c.us', 'number2@c.us', 'number3@c.us']);
            console.log(result);
        }
        */ // COMMENTED DUE TO WA BAN 
        /*
        else if (msg.body === ',creategroup') {
            const partitipantsToAdd = ['number1@c.us', 'number2@c.us', 'number3@c.us'];
            const result = await client.createGroup('Group Title', partitipantsToAdd);
            console.log(result);
        }
        */  // COMMENTED DUE TO UNVERIFIED TESTING
        else if (msg.body === ',groupinfo') {
            let chat = await msg.getChat();
            if (chat.isGroup) {
                await msg.reply(`
                    *Group Details*
                    Name: ${chat.name}
                    Description: ${chat.description}
                    Created At: ${chat.createdAt.toString()}
                    Created By: ${chat.owner.user}
                    Participant count: ${chat.participants.length}
                `);
            } else {
                await msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body === ',chats') {
            if(!checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin')){ msg.reply("> Unauthorized commands"); return; }
            const chats = await client.getChats();
            await client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
        } else if (msg.body === ',info') {
            let info = client.info;
            await client.sendMessage(msg.from, `
                *Connection info*
                User name: ${info.pushname}
                My number: ${info.wid.user}
                Platform: ${info.platform}
            `);
        } else if (msg.body === ',mediainfo' && msg.hasMedia) {
            const attachmentData = await msg.downloadMedia();
            await msg.reply(`
                *Media info*
                MimeType: ${attachmentData.mimetype}
                Filename: ${attachmentData.filename}
                Data (length): ${attachmentData.data.length}
            `);
        } else if (msg.body === ',quoteinfo' && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
    
            await quotedMsg.reply(`
                ID: ${quotedMsg.id._serialized}
                Type: ${quotedMsg.type}
                Author: ${quotedMsg.author || quotedMsg.from}
                Timestamp: ${quotedMsg.timestamp}
                Has Media? ${quotedMsg.hasMedia}
            `);
        } else if (msg.body === ',resendmedia' && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                const attachmentData = await quotedMsg.downloadMedia();
                await client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
            }
            if (quotedMsg.hasMedia && quotedMsg.type === 'audio') {
                const audio = await quotedMsg.downloadMedia();
                await client.sendMessage(msg.from, audio, { sendAudioAsVoice: true });
            }
        } else if (msg.body === ',isviewonce' && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                const media = await quotedMsg.downloadMedia();
                await client.sendMessage(msg.from, media, { isViewOnce: true });
            }
        }
        /*
        else if (msg.body === ',location') {
            await msg.reply(new Location(37.422, -122.084));
            await msg.reply(new Location(37.422, -122.084, { name: 'Googleplex' }));
            await msg.reply(new Location(37.422, -122.084, { address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA' }));
            await msg.reply(new Location(37.422, -122.084, { name: 'Googleplex', address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA', url: 'https://google.com' }));
        } 
        */  // LOCATIONN NOT WORKING 
        else if (msg.location) {
            await msg.reply(msg.location);
        } else if (msg.body.startsWith(',status ')) {
            if(!checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin')){ msg.reply("> Unauthorized commands"); return; }
            const newStatus = msg.body.split(' ')[1];
            await client.setStatus(newStatus);
            await msg.reply(`Status was updated to *${newStatus}*`);
        } 
        /*
        else if (msg.body.startsWith(',mentionUsers ')) {
            const chat = await msg.getChat();
            const mentioned = msg._data.mentionedIds > 0 ? msg._data.mentionedIds : null ;
            const userNumber = mentioned === null ? `No mentions detected.` : `${mentioned[0]?.split('@')[0]}`;
            await chat.sendMessage(msg.from ,`Hi @${userNumber}`, {
                mentions: userNumber + '@c.us'
            });
            await chat.sendMessage(msg.from, `Hi @${userNumber}, @${userNumber}`, {
                mentions: [userNumber + '@c.us', userNumber + '@c.us']
            });
        }
        */  // UNCLEAR, i cant understand, commented for now
        /*
        else if (msg.body === ',mentionGroups') {
            const chat = await msg.getChat();
            const groupId = chat.grou;
            await chat.sendMessage(`Check the last message here: @${groupId}`, {
                groupMentions: { subject: 'GroupSubject', id: groupId }
            });
            await chat.sendMessage(`Check the last message in these groups: @${groupId}, @${groupId}`, {
                groupMentions: [
                    { subject: 'FirstGroup', id: groupId },
                    { subject: 'SecondGroup', id: groupId }
                ]
            });
        }
        */  // UNCLEAR, i cant understand, commented for now
        /*
        else if (msg.body === ',getGroupMentions') {
            const groupId = 'ZZZZZZZZZZ@g.us';
            const msg = await client.sendMessage('chatId', `Check the last message here: @${groupId}`, {
                groupMentions: { subject: 'GroupSubject', id: groupId }
            });
            const groupMentions = await msg.getGroupMentions();
            console.log(groupMentions);
        } 
        */  // Same...
        else if (msg.body === ',delete') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                try{
                    quotedMsg.delete(true);
                }catch(e){ msg.reply(`Failed to delete the msg. \n \n ${e}`) }
            }
        } else if (msg.body === ',pin') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            const chat = await msg.getChat();
            await chat.pin();
        } else if (msg.body === ',archive') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            const chat = await msg.getChat();
            await chat.archive();
        } else if (msg.body === ',mute') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            const chat = await msg.getChat();
            const unmuteDate = new Date();
            unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
            await chat.mute(unmuteDate);
        } else if (msg.body === ',typing') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            const chat = await msg.getChat();
            chat.sendStateTyping();
        } else if (msg.body === ',recording') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            const chat = await msg.getChat();
            chat.sendStateRecording();
        } else if (msg.body === ',clearstate') {
            if(!checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin')){ msg.reply("> Unauthorized commands"); return; }
            const chat = await msg.getChat();
            chat.clearState();
        } else if (msg.body === ',reaction') {
            msg.react('👍');
        } else if (msg.body.startsWith(',sendpoll ')) {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            const pollBody = msg.body.split(' ');
            const pollName = pollBody[1];
            const multAns = pollBody[2] === 'ma' ? true : false;
            await msg.reply(new Poll(pollName, extractPollOpt(pollBody, multAns), { allowMultipleAnswers: multAns }));
            /*
            await msg.reply(new Poll('Winter or Summer?', ['Winter', 'Summer']));
            await msg.reply(new Poll('Cats or Dogs?', ['Cats', 'Dogs'], { allowMultipleAnswers: true }));
            await msg.reply(
                new Poll('Cats or Dogs?', ['Cats', 'Dogs'], {
                    messageSecret: [
                        1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                    ]
                })
            );
            */
        } /* else if (msg.body === ',updatelabels') {
            const chat = await msg.getChat();
            await chat.changeLabels([0, 1]);
        } else if (msg.body === ',addlabels') {
            const chat = await msg.getChat();
            let labels = (await chat.getLabels()).map((l) => l.id);
            labels.push('0');
            labels.push('1');
            await chat.changeLabels(labels);
        } */ else if (msg.body === ',approverequest') {
            await client.approveGroupMembershipRequests(msg.from, { requesterIds: 'number@c.us' });
            const group = await msg.getChat();
            await group.approveGroupMembershipRequests({ requesterIds: 'number@c.us' });
            const approval = await client.approveGroupMembershipRequests(msg.from, {
                requesterIds: ['number1@c.us', 'number2@c.us']
            });
            console.log(approval);
            await client.approveGroupMembershipRequests(msg.from);
            await client.approveGroupMembershipRequests(msg.from, {
                requesterIds: ['number1@c.us', 'number2@c.us'],
                sleep: 300
            });
            await client.approveGroupMembershipRequests(msg.from, {
                requesterIds: ['number1@c.us', 'number2@c.us'],
                sleep: [100, 300]
            });
            await client.approveGroupMembershipRequests(msg.from, {
                requesterIds: ['number1@c.us', 'number2@c.us'],
                sleep: null
            });
        } else if (msg.body === ',pinmsg') {
            const result = await msg.pin(60);
            console.log(result);
        } else if (msg.body === ',syncHistory') {
            const isSynced = await client.syncHistory(msg.from);
            await msg.reply(isSynced ? 'Historical chat is syncing..' : 'There is no historical chat to sync.');
        } else if (msg.body === ',statuses') {
            const statuses = await client.getBroadcasts();
            console.log(statuses);
            const chat = await statuses[0]?.getChat();
            console.log(chat);
        } else if (msg.body === ',fallback') {
            sendFallbackMessage(msg);
        } else if (msg.body === ',get') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            if (msg.hasQuotedMsg) {
                const qlines = msg._data.quotedMsg.body.split('\n');
                if (qlines[3]?.match(/-?\d+\s[÷×+\-*/]\s-?\d+/)) {
                    const ans = mathSolver(qlines[3]);
                    await client.sendMessage(msg.author, `${ans.answer}`);
                } else {
                    await msg.reply("> Automated Answer \n \n _No valid math question detected._");
                }
            } else {
                await msg.reply("> Automated Answer \n \n _No quoted message found or quoted message body is missing._");
            }
        } else if (msg.body === ',@e') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            let chat = await msg.getChat();
            let text = '';
            const mentioned = chat.participants.map(p => {
                text += `@${p.id.user} `;
                return `${p.id.user}@c.us`;
            });
            await chat.sendMessage(text, { mentions: mentioned });
        } else if (msg.body === ',suit') {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            let chat = await msg.getChat();
            const numAuthor = msg.author.split('@')[0];
            const cus = `${numAuthor}@c.us`;
            const cmd = `.suit @${numAuthor}`;
            await chat.sendMessage(cmd, { mentions: [cus] });
        } else if (msg.body.startsWith(',bb ')) {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'admin') || checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            const amount = Math.round(Number(msg.body.split(' ')[1]));
            let chat = await msg.getChat();
            if (amount > 0) {
                await chat.sendMessage(`.buylimit ${amount}`);
            } else {
                await msg.reply("> Automated Message \n \n _Buy number cannot be less than 1_" );
            }
        } else if (msg.body.startsWith(',tf ')) {
            if (!(checkPermission((msg.author === undefined ? msg.from : msg.author), 'superAdmin'))) {
                msg.reply("> Unauthorized commands");
                return;
            }
            const amount = Number(msg.body.split(' ')[1]);
            const num = msg.author.split('@')[0];
            if (amount > 1000) {
                await client.sendMessage(msg.from, `.tfbalance @${num} ${amount}`, { mentions: msg.author });
            } else {
                await msg.reply("> Automated Message \n \n _TF balance cannot be less than 1000_" );
            }
        } else if (msg.body.startsWith(',j ')) {
            const res = msg.body.split(' ');
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
        } else if (msg.body.startsWith(',lastmedia')) {
            const res = msg.body.split(' ');
            const mediaData = getLastMediaData();
            const mediaBase64 = new MessageMedia(`${mediaData.mimetype}`, `${mediaData.data}`);
            await client.sendMessage(
                msg.from, 
                mediaBase64, 
                {   
                    isViewOnce: (res[1] ? res[1] === 'vo' ? true : false : false),
                    caption: (res[1] ? res[1] === 'vo' ? res[2] ? res[2] : null : res[1] : null),
                    sendMediaAsSticker: (res[1] ? res[1] === 's' ? true : false : false),
                });
        } else if (msg.body === ',s') {
            console.log(msg.hasMedia);
            if(msg.hasMedia){
                const mediaData = await msg.downloadMedia();
                const mediaBase64 = new MessageMedia(`${mediaData.mimetype}`, `${mediaData.data}`);
                await client.sendMessage(
                    msg.from, 
                    mediaBase64, 
                    {   
                    sendMediaAsSticker: true,
                    });
            }
        } else if (msg.body === ',svmedia') {
            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                saveMedia(media);
                await msg.reply("Media saved!");
            }else{
                await msg.reply("No media found.");
            }
        } else if (msg.body === ',startm') {
            state.atChat = msg.from;
            //const timeout = Number.parseInt(msg.body.split(' ')[1]);
            msg.reply(`Starting Task. Call \`,stopm\` to stop this process.`);
            state.inter = setInterval(async () => {
                if(!state.waitingQuestion || state.waitingFor > 10){
                    state.waitingQuestion = true;
                    state.waitingFor = 0;
                    await client.sendMessage(state.atChat,".math impossible");
                }
                state.waitingFor += 1;
            }, 1000);
            /*
            setTimeout(async () => { 
                clearInterval(state.inter); 
                await msg.reply(`Task completed. TO: \`${timeout}m\``);
                state.inter = null;
                state.chatAt = null;
             }, ((timeout * 60) * 1000));
            */
        } else if (msg.body === ',startm pc') {
            state.atChat = '62882006844990@c.us';
            //const timeout = Number.parseInt(msg.body.split(' ')[1]);
            msg.reply(`Starting Task. Call \`,stopm\` to stop this process.`);
            state.inter = setInterval(async () => {
                if(!state.waitingQuestion || state.waitingFor > 10){
                    state.waitingQuestion = true;
                    state.waitingFor = 0;
                    await client.sendMessage(state.atChat,".math impossible");
                }
                state.waitingFor += 1;
            }, 1000);
            /*
            setTimeout(async () => { 
                clearInterval(state.inter); 
                await msg.reply(`Task completed. TO: \`${timeout}m\``);
                state.inter = null;
                state.chatAt = null;
             }, ((timeout * 60) * 1000));
            */
        } else if (msg.body === ',stopm') {
            msg.reply(`Stopping Task. Call \`,startm\` to re-start this process.`);
            clearInterval(state.inter);
        } else if (msg.body.startsWith(',g ')) {
            let chat = await msg.getChat();
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
    } catch (err){ 
        msg.reply("_Invalid syntax or internal error_ \n  _Check your manual logs to see details._");
        console.log(err) 
    }
});

client.on('message_create', async (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }

    // Unpins a message
    if (msg.fromMe && msg.body.startsWith(',unpin')) {
        const pinnedMsg = await msg.getQuotedMessage();
        if (pinnedMsg) {
            // Will unpin a message
            const result = await pinnedMsg.unpin();
            console.log(result); // True if the operation completed successfully, false otherwise
        }
    }
});

client.on('message_ciphertext', (msg) => {
    // Receiving new incoming messages that have been encrypted
    // msg.type === 'ciphertext'
    msg.body = 'Waiting for this message. Check your phone.';
    
    // do stuff here
});

client.on('message_revoke_everyone', async (after, before) => {
    state.lastChat = {
        notifyName: before.notifyName,
        msg: before.body,
    };
    if (before) {
        console.log(before); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    console.log(msg.body); // message before it was deleted.
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if (ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    notification.reply('User left.');
});

client.on('group_update', (notification) => {
    // Group picture, subject or description has been updated.
    console.log('update', notification);
});

client.on('change_state', state => {
    console.log('CHANGE STATE', state);
});

// Change to false if you don't want to reject incoming calls
let rejectCalls = true;

client.on('call', async (call) => {
    console.log('Call received, rejecting. GOTO Line 261 to disable', call);
    if (rejectCalls) await call.reject();
    await client.sendMessage(call.from, `[${call.fromMe ? 'Outgoing' : 'Incoming'}] Phone call from ${call.from}, type ${call.isGroup ? 'group' : ''} ${call.isVideo ? 'video' : 'audio'} call. ${rejectCalls ? 'This call was automatically rejected by the script.' : ''}`);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

client.on('contact_changed', async (message, oldId, newId, isContact) => {
    /** The time the event occurred. */
    const eventTime = (new Date(message.timestamp * 1000)).toLocaleString();

    console.log(
        `The contact ${oldId.slice(0, -5)}` +
        `${!isContact ? ' that participates in group ' +
            `${(await client.getChatById(message.to ?? message.from)).name} ` : ' '}` +
        `changed their phone number\nat ${eventTime}.\n` +
        `Their new phone number is ${newId.slice(0, -5)}.\n`);

    /**
     * Information about the @param {message}:
     * 
     * 1. If a notification was emitted due to a group participant changing their phone number:
     * @param {message.author} is a participant's id before the change.
     * @param {message.recipients[0]} is a participant's id after the change (a new one).
     * 
     * 1.1 If the contact who changed their number WAS in the current user's contact list at the time of the change:
     * @param {message.to} is a group chat id the event was emitted in.
     * @param {message.from} is a current user's id that got an notification message in the group.
     * Also the @param {message.fromMe} is TRUE.
     * 
     * 1.2 Otherwise:
     * @param {message.from} is a group chat id the event was emitted in.
     * @param {message.to} is @type {undefined}.
     * Also @param {message.fromMe} is FALSE.
     * 
     * 2. If a notification was emitted due to a contact changing their phone number:
     * @param {message.templateParams} is an array of two user's ids:
     * the old (before the change) and a new one, stored in alphabetical order.
     * @param {message.from} is a current user's id that has a chat with a user,
     * whos phone number was changed.
     * @param {message.to} is a user's id (after the change), the current user has a chat with.
     */
});

client.on('group_admin_changed', (notification) => {
    if (notification.type === 'promote') {
        /** 
          * Emitted when a current user is promoted to an admin.
          * {@link notification.author} is a user who performs the action of promoting/demoting the current user.
          */
        console.log(`You were promoted by ${notification.author}`);
    } else if (notification.type === 'demote')
        /** Emitted when a current user is demoted to a regular user. */
        console.log(`You were demoted by ${notification.author}`);
});

client.on('group_membership_request', async (notification) => {
    /**
     * The example of the {@link notification} output:
     * {
     *     id: {
     *         fromMe: false,
     *         remote: 'groupId@g.us',
     *         id: '123123123132132132',
     *         participant: 'number@c.us',
     *         _serialized: 'false_groupId@g.us_123123123132132132_number@c.us'
     *     },
     *     body: '',
     *     type: 'created_membership_requests',
     *     timestamp: 1694456538,
     *     chatId: 'groupId@g.us',
     *     author: 'number@c.us',
     *     recipientIds: []
     * }
     *
     */
    console.log(notification);
    /** You can approve or reject the newly appeared membership request: */
    await client.approveGroupMembershipRequestss(notification.chatId, notification.author);
    await client.rejectGroupMembershipRequests(notification.chatId, notification.author);
});

client.on('message_reaction', async (reaction) => {
    console.log('REACTION RECEIVED', reaction);
});

client.on('vote_update', (vote) => {
    /** The vote that was affected: */
    console.log(vote);
});


