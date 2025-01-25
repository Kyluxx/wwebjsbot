import { createConnection } from "mysql";
 
const hostname = "3ro3p.h.filess.io";
const database = "kyluxx_widelyjoy";
const port = "3307";
const username = "kyluxx_widelyjoy";
const password = "2a36a6e0bd1ffe3d729b7e089de89072eccb19f9";
 
const con = createConnection({
  host: hostname,
  user: username,
  password: password, // Explicitly define this
  database: database,
  port: port,
});
 
con.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
    return;
  }
  console.log("Connected!");
});
/*
con.query("SELECT 1 + 1 AS solution", (err, results) => {
  if (err) {
    console.error("Query error:", err.message);
    return;
  }
  console.log("Query result:", results);
});
*/

const addAcc = async (...args) => {
  const num = args[0];
  const query = `
    INSERT INTO users (user_phone) VALUES (?) 
    ON DUPLICATE KEY UPDATE user_phone = user_phone AND user_gems = user_gems;
  `;

  return new Promise((resolve, reject) => {
    con.query(query, [num], (err, results) => {
      if (err) {
        console.error("Query error:", err.message);
        reject("Failed to execute query.");
        return;
      }

      if (results.affectedRows === 1) {
        // A new user was created
        resolve("User successfully created.");
      } else if (results.affectedRows === 2) {
        // The user already exists (duplicate key update triggered)
        resolve("User already exists.");
      } else {
        resolve("No changes were made.");
      }
    });
  });
};



// Close the connection when done
/*
con.end((err) => {
  if (err) console.error("Error closing connection:", err.message);
  else console.log("Connection closed.");
});
*/

export { addAcc }