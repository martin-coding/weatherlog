const express = require("express");
const dotenv = require("dotenv");

/* Reading global variables from config file */
dotenv.config();
const PORT = process.env.PORT;

app = express();

app.get('/', (req, res) => {
    res.send("Hello weatherlog!");
});

app.listen(PORT, function() {
  console.log(`Weatherlog running and listening on port ${PORT}`);
});