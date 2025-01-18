import fs from 'fs';
// Function to read the last chat log
function readLastChatLog() {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsedData = JSON.parse(data);

    if (!parsedData.logs || !Array.isArray(parsedData.logs)) {
      throw new Error('Invalid logs format');
    }

    return parsedData.logs.at(-1) || null; // Use `.at(-1)` for the last element, or `null` if empty
  } catch (err) {
    console.error('Error reading the last chat log:', err);
    return null;
  }
}

// Function to save a new chat log
// Function to save a new chat log
function saveChatLog({ userName, number, content }) {
  try {
    // Read the current logs from the file
    const data = fs.readFileSync(filePath, 'utf8');
    const chatData = JSON.parse(data);

    if (!chatData.logs || !Array.isArray(chatData.logs)) {
      throw new Error('Invalid logs format');
    }

    const chatId = (chatData.logs.length + 1).toString();
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });

    const newChatLog = {
      chatId,
      userName,
      number,
      content,
      timestamp,
    };

    // Add the new chat log to the existing array
    chatData.logs.push(newChatLog);

    // Write the updated logs back to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(chatData, null, 2), 'utf8');
    console.log('Chat log saved successfully!');
  } catch (err) {
    console.error('Error saving chat log:', err);
  }
}


// Example: Reading the last chat log
const filePath = './logs/chatlogs.json';
const lastLog = readLastChatLog(filePath);
console.log('Last log:', lastLog);

// Example: Saving a new chat log



// Example usage
/*
const newChatMessage = {
  userName: "v4LUE",
  number: "62895634600989@c.us",
  content: "gilang goblok"
};
*/

//saveChatLog(newChatMessage);

export { saveChatLog, readLastChatLog };
