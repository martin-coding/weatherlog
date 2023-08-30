const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

/* Reading global variables from config file */
dotenv.config();
const PORT = process.env.PORT;

app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.get("/", function(request, response) {
    response.render("index");
});

app.get("/dashboard", function(request, response) {
    response.render("dashboard");
});

app.get("/stations/:id", function(request, response) {
    response.render("stations");
});

app.listen(PORT, function() {
  console.log(`Weatherlog running and listening on port ${PORT}`);
});