import pkg from 'whatsapp-web.js';
import qrcode from "qrcode-terminal";
const { Client, Location, Poll, List, Buttons, LocalAuth, MessageMedia } = pkg;

const client = new Client({
    authStrategy: new LocalAuth(),
    // proxyAuthentication: { username: 'username', password: 'password' },
    puppeteer: { 
        // args: ['--proxy-server=proxy-server-that-requires-authentication.example.com'],
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
    const fallbackMessage = `> Fallback Triggered \n \n _User :_ ${lastChat.notifyName} \n _Message:_ { ${lastChat.msg} }`;
    await msg.reply(fallbackMessage);
};

const state = {
    started: false,
    uptime: null,
    fallbackOn: false,
    lastChat: { notifyName: null, msg: null },
    savemsg: false,
    autotrigger: false,
    waitingQuestion: false,
    atChat: null,
    inter: null,
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
        { cmd: ',location', desc: 'Send various location message examples' },
        { cmd: ',status <text>', desc: 'Update bot status message' },
        { cmd: ',reaction', desc: 'React to message with 👍' },
        { cmd: ',sendpoll', desc: 'Create and send poll messages' },
        { cmd: ',typing', desc: 'Show typing indicator in chat' },
        { cmd: ',recording', desc: 'Show recording audio indicator in chat' },
        { cmd: ',clearstate', desc: 'Clear typing/recording state' },
        { cmd: ',delete', desc: 'Delete quoted message (only own messages)' },
        { cmd: ',pin', desc: 'Pin the current chat' },
        { cmd: ',archive', desc: 'Archive the current chat' },
        { cmd: ',mute', desc: 'Mute chat for 20 seconds' },
        { cmd: ',pinmsg', desc: 'Pin message for 1 minute' },
        { cmd: ',syncHistory', desc: 'Sync chat history' },
        { cmd: ',fallback', desc: 'Get the (last) chat before (this) sends.' },
    ],
    group: [
        { cmd: ',subject <text>', desc: 'Change group subject' },
        { cmd: ',desc <text>', desc: 'Change group description' },
        { cmd: ',leave', desc: 'Leave current group' },
        { cmd: ',join <code>', desc: 'Join group via invite code' },
        { cmd: ',addmembers', desc: 'Add members to group' },
        { cmd: ',creategroup', desc: 'Create a new group' },
        { cmd: ',groupinfo', desc: 'Show group details' },
        { cmd: ',mentionUsers', desc: 'Mention users in message' },
        { cmd: ',mentionGroups', desc: 'Mention groups in message' },
        { cmd: ',getGroupMentions', desc: 'Get group mentions from message' },
        { cmd: ',approverequest', desc: 'Approve group join requests' }
    ],
    labels: [
        { cmd: ',updatelabels', desc: 'Update chat labels' },
        { cmd: ',addlabels', desc: 'Add new labels to chat' }
    ],
    status: [
        { cmd: ',statuses', desc: 'Get broadcast statuses' }
    ]
};

const generateHelp = () => {
    let help = '➤──────────「 *Help Menu* 」──────────➤\n\n';
    
    // General commands section
    help += '📌 General Commands:\n';
    if (commandDocs.general) {
        commandDocs.general.forEach(cmd => {
            help += `▶ ${cmd.cmd} : ${cmd.desc}\n`;
        });
    }

    // Group commands section
    help += '\n📌 Group Commands:\n';
    if (commandDocs.group) {
        commandDocs.group.forEach(cmd => {
            help += `▶ ${cmd.cmd} : ${cmd.desc}\n`;
        });
    }

    // Label commands section
    help += '\n📌 Label Commands:\n';
    if (commandDocs.labels) {
        commandDocs.labels.forEach(cmd => {
            help += `▶ ${cmd.cmd} : ${cmd.desc}\n`;
        });
    }

    // Status commands section
    help += '\n📌 Status Commands:\n';
    if (commandDocs.status) {
        commandDocs.status.forEach(cmd => {
            help += `▶ ${cmd.cmd} : ${cmd.desc}\n`;
        });
    }

    help += '\n➤──────────────────────────────────➤';
    return help;
};



// Permission management
const permissions = {
    superAdmin: {
        "62895634600989@c.us": true  // Super admin access
    },
    admin: {
        // "6289666112403@c.us": true   // Admin access
    }
};

// Helper function to check permissions
const checkPermission = (userId, level) => {
    if (level === 'superAdmin') return permissions.superAdmin[userId];
    if (level === 'admin') return permissions.superAdmin[userId] || permissions.admin[userId];
    return false;
};



client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);
    state.lastChat = msg;

    try {
        if (msg.body === ',ping reply') {
            // Send a new message as a reply to the current one
            msg.reply('pong');
    
        } else if (msg.body === ',help') {
            // Send a new message to the same chat
            client.sendMessage(msg.from, `${generateHelp()}`);
        } else if (msg.body === ',ping') {
            // Send a new message to the same chat
            client.sendMessage(msg.from, 'pong');
        } else if (msg.body.startsWith(',sendto ')) {
            // Direct send a new message to specific id
            let number = msg.body.split(' ')[1];
            let messageIndex = msg.body.indexOf(number) + number.length;
            let message = msg.body.slice(messageIndex, msg.body.length);
            number = number.includes('@c.us') ? number : `${number}@c.us`;
            let chat = await msg.getChat();
            chat.sendSeen();
            client.sendMessage(number, message);
    
        } else if (msg.body.startsWith(',subject ')) {
            // Change the group subject
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newSubject = msg.body.slice(9);
                chat.setSubject(newSubject);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body.startsWith(',echo ')) {
            // Replies with the same message
            msg.reply(msg.body.slice(6));
        } else if (msg.body.startsWith(',preview ')) {
            const text = msg.body.slice(9);
            msg.reply(text, null, { linkPreview: true });
        } else if (msg.body.startsWith(',desc ')) {
            // Change the group description
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newDescription = msg.body.slice(6);
                chat.setDescription(newDescription);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body === ',leave') {
            // Leave the group
            let chat = await msg.getChat();
            if (chat.isGroup) {
                chat.leave();
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body.startsWith(',join ')) {
            const inviteCode = msg.body.split(' ')[1];
            try {
                await client.acceptInvite(inviteCode);
                msg.reply('Joined the group!');
            } catch (e) {
                msg.reply('That invite code seems to be invalid.');
            }
        } else if (msg.body.startsWith(',addmembers')) {
            const group = await msg.getChat();
            const result = await group.addParticipants(['number1@c.us', 'number2@c.us', 'number3@c.us']);
            console.log(result);
        } else if (msg.body === ',creategroup') {
            const partitipantsToAdd = ['number1@c.us', 'number2@c.us', 'number3@c.us'];
            const result = await client.createGroup('Group Title', partitipantsToAdd);
            console.log(result);
        } else if (msg.body === ',groupinfo') {
            let chat = await msg.getChat();
            if (chat.isGroup) {
                msg.reply(`
                    *Group Details*
                    Name: ${chat.name}
                    Description: ${chat.description}
                    Created At: ${chat.createdAt.toString()}
                    Created By: ${chat.owner.user}
                    Participant count: ${chat.participants.length}
                `);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body === ',chats') {
            const chats = await client.getChats();
            client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
        } else if (msg.body === ',info') {
            let info = client.info;
            client.sendMessage(msg.from, `
                *Connection info*
                User name: ${info.pushname}
                My number: ${info.wid.user}
                Platform: ${info.platform}
            `);
        } else if (msg.body === ',mediainfo' && msg.hasMedia) {
            const attachmentData = await msg.downloadMedia();
            msg.reply(`
                *Media info*
                MimeType: ${attachmentData.mimetype}
                Filename: ${attachmentData.filename}
                Data (length): ${attachmentData.data.length}
            `);
        } else if (msg.body === ',quoteinfo' && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
    
            quotedMsg.reply(`
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
                client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
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
        } else if (msg.body === ',location') {
            await msg.reply(new Location(37.422, -122.084));
            await msg.reply(new Location(37.422, -122.084, { name: 'Googleplex' }));
            await msg.reply(new Location(37.422, -122.084, { address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA' }));
            await msg.reply(new Location(37.422, -122.084, { name: 'Googleplex', address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA', url: 'https://google.com' }));
        } else if (msg.location) {
            msg.reply(msg.location);
        } else if (msg.body.startsWith(',status ')) {
            const newStatus = msg.body.split(' ')[1];
            await client.setStatus(newStatus);
            msg.reply(`Status was updated to *${newStatus}*`);
        } else if (msg.body === ',mentionUsers') {
            const chat = await msg.getChat();
            const userNumber = 'XXXXXXXXXX';
            await chat.sendMessage(`Hi @${userNumber}`, {
                mentions: userNumber + '@c.us'
            });
            await chat.sendMessage(`Hi @${userNumber}, @${userNumber}`, {
                mentions: [userNumber + '@c.us', userNumber + '@c.us']
            });
        } else if (msg.body === ',mentionGroups') {
            const chat = await msg.getChat();
            const groupId = 'YYYYYYYYYY@g.us';
            await chat.sendMessage(`Check the last message here: @${groupId}`, {
                groupMentions: { subject: 'GroupSubject', id: groupId }
            });
            await chat.sendMessage(`Check the last message in these groups: @${groupId}, @${groupId}`, {
                groupMentions: [
                    { subject: 'FirstGroup', id: groupId },
                    { subject: 'SecondGroup', id: groupId }
                ]
            });
        } else if (msg.body === ',getGroupMentions') {
            const groupId = 'ZZZZZZZZZZ@g.us';
            const msg = await client.sendMessage('chatId', `Check the last message here: @${groupId}`, {
                groupMentions: { subject: 'GroupSubject', id: groupId }
            });
            const groupMentions = await msg.getGroupMentions();
            console.log(groupMentions);
        } else if (msg.body === ',delete') {
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.fromMe) {
                    quotedMsg.delete(true);
                } else {
                    msg.reply('I can only delete my own messages');
                }
            }
        } else if (msg.body === ',pin') {
            const chat = await msg.getChat();
            await chat.pin();
        } else if (msg.body === ',archive') {
            const chat = await msg.getChat();
            await chat.archive();
        } else if (msg.body === ',mute') {
            const chat = await msg.getChat();
            const unmuteDate = new Date();
            unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
            await chat.mute(unmuteDate);
        } else if (msg.body === ',typing') {
            const chat = await msg.getChat();
            chat.sendStateTyping();
        } else if (msg.body === ',recording') {
            const chat = await msg.getChat();
            chat.sendStateRecording();
        } else if (msg.body === ',clearstate') {
            const chat = await msg.getChat();
            chat.clearState();
        } else if (msg.body === ',reaction') {
            msg.react('👍');
        } else if (msg.body === ',sendpoll') {
            await msg.reply(new Poll('Winter or Summer?', ['Winter', 'Summer']));
            await msg.reply(new Poll('Cats or Dogs?', ['Cats', 'Dogs'], { allowMultipleAnswers: true }));
            await msg.reply(
                new Poll('Cats or Dogs?', ['Cats', 'Dogs'], {
                    messageSecret: [
                        1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                    ]
                })
            );
        } else if (msg.body === ',updatelabels') {
            const chat = await msg.getChat();
            await chat.changeLabels([0, 1]);
        } else if (msg.body === ',addlabels') {
            const chat = await msg.getChat();
            let labels = (await chat.getLabels()).map((l) => l.id);
            labels.push('0');
            labels.push('1');
            await chat.changeLabels(labels);
        } else if (msg.body === ',approverequest') {
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
        notifyName: before._data.notifyName,
        msg: before._data.body,
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
