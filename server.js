import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
let started = false;

const cli = new Client({
    restartOnAuthFail: true,
    webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html",
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

cli.on('qr', (qr) => {
    if(!started){
        qrcode.generate(qr, {small: true});
        started = true;
    }
    console.log("Running...");
});

cli.on('ready', ()=>{
    console.log('Cli is ready!'); 
});

cli.on('message', async (msg) => {
    // Log the entire message object to debug issues
    console.log("Received Message Object:", JSON.stringify(msg, null, 2));

    const chat = await msg.getChat(); // Get the associated chat
    console.log(`Is Group: ${chat.isGroup}`); // Check if it's a group message

    const data = msg.body.trim(); // The entire message as a string
    console.log(`Received msg body: ${msg.body}`);

    const res = data.split(' '); // Split message into words
    const command = res[0]; // Extract the first word as the command

    // Check if it's a group message and handle mentions
    if (chat.isGroup) {
        console.log('This message is from a group.');

        const mentions = await msg.getMentions(); // Get all mentioned users in the message
        if (mentions.length > 0) {
            console.log('Mentions:', mentions);
        }

        if (mentions.length > 0 && command === ',say') { // Check if command is ',say' and there's a mention
            const mentionedUser = mentions[0]; // Get the first mentioned user
            const mentionedUserId = mentionedUser.id._serialized; // Get the ID of the mentioned user
            const messageToSay = res.slice(-1).join(' '); // Get the last word(s)

            console.log('Mentioned User:', mentionedUser.pushname); // Mentioned user pushname
            console.log('Message to say:', messageToSay);

            // Send a reply mentioning the user
            const response = `Dengerin ya _*${mentionedUser.pushname}*_ lu itu ${messageToSay} BANGET SIH`;
            await msg.reply(response); // Send the reply
            return; // Exit early after sending the reply
        }
    }

    // Handle other command-based responses
    if (commandReplies[command]) {
        msg.reply(commandReplies[command]()); // Call the function to get the response
    }
});


const commandReplies = {
    ',p': () => { return "Pong!" },
    ',help': () => { return "> Bot in Development \n *,credit* -> Information about this bot \n *,help* -> Command help \n *,p* -> Ping bot \n *,say <@tag> <msg>* -> Yapping" },
    ',credit': () => { return '> Bot Information \n _Author_ : @Kyluxx && @Sam \n _Supported by_ : @wwebjs' },
    //',turnoff': () => { cli.logout(); return "Shutdown..."; }
};


cli.initialize();