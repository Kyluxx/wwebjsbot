const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  
import fs from 'fs';

const filePath = './privatedata/jadwaldata.json';

function getCurrentDay(classname) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`Received param: ${classname}`);
    const now = new Date();
    const currentDay = days[now.getDay()];
    
    return data.classes[classname]?.[currentDay] || null; // Return the schedule or null if not found
  } catch (err) {
    console.error('Error reading jadwaldata.json:', err);
    return null;
  }
}

function getNextDay(classname) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`Received param: ${classname}`);
    const now = new Date();
    const nextDay = days[now.getDay() === 6 ? 0 : now.getDay() + 1];
    
    return data.classes[classname]?.[nextDay] || null; // Return the schedule or null if not found
  } catch (err) {
    console.error('Error reading jadwaldata.json:', err);
    return null;
  }
}

function getSpecifiedDay(day, classname) {
    try {
      const intday = Number(day); // Convert the input to a number
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const dayName = days[intday]; // Map day index to name
      console.log(`Day Index: ${intday}, Day Name: ${dayName}`);
      return data.classes[classname]?.[dayName] || null; // Return the schedule or null if not found
    } catch (err) {
      console.error('Error reading jadwaldata.json:', err);
      return null;
    }
  }
  

// Example usage
console.log(getCurrentDay('xirpl4')); // Output: Array or null
console.log(getNextDay('ClassA'));    // Output: Array or null

  
  console.log(getCurrentDay()); // Example: "Friday"

export { getCurrentDay, getNextDay, getSpecifiedDay };
  