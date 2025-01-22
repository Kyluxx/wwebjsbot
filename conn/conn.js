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
 
con.query("SELECT 1 + 1 AS solution", (err, results) => {
  if (err) {
    console.error("Query error:", err.message);
    return;
  }
  console.log("Query result:", results);
});
con.query(
`
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  user_name VARCHAR(255),
  user_gems INT
);
`, (err, results) => {
  if (err) {
    console.error("Query error:", err.message);
    return;
  }
  console.log("Query result:", results);
});
 
// Close the connection when done
con.end((err) => {
  if (err) console.error("Error closing connection:", err.message);
  else console.log("Connection closed.");
});