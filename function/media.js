import fs from 'fs';

const filePath = './savedmedia/media.jsonl';

function saveMedia({ mimetype, data, filename, filesize }) {
  try {
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const mediaId = Date.now().toString();
    const newMediaLog = {
      mimetype,
      data,
      filename: filename || `${Math.floor(Math.random() * 1000000 + 1)}_medialog`,
      filesize,
      timestamp,
      mediaId,
    };

    // Convert to JSON and append as a line
    const jsonLine = JSON.stringify(newMediaLog);
    fs.appendFileSync(filePath, jsonLine + '\n', 'utf8');
    console.log('Media log saved successfully!');
  } catch (err) {
    console.error('Error saving media log:', err);
  }
}


function getLastMediaData() {
  try {
    // Read the file content as a stream for memory efficiency
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.trim().split('\n'); // Split by lines and remove empty lines

    if (lines.length === 0) {
      throw new Error('No valid media data found.');
    }

    const lastLine = lines[lines.length - 1]; // Get the last line
    return JSON.parse(lastLine); // Parse the last JSON object
  } catch (err) {
    console.error('Error retrieving the last media log:', err);
    throw err;
  }
}


export { saveMedia, getLastMediaData };
