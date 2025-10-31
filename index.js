const weatherAssignment = require('./weatherAssignment');
const validator = require("email-validator");
const session = require("express-session");
const bodyParser = require("body-parser");
const express = require("express");
const dotenv = require("dotenv");
const axios = require('axios');
const path = require("path");
const pg = require("pg");

/* Reading global variables from config file */
dotenv.config();
const PORT = process.env.PORT;
const secret = process.env.SECRET;
const apikey = process.env.API_KEY;
const conString = process.env.DB_CON_STRING;

app = express();

const urlencodedParser = bodyParser.urlencoded({
    extended: false
});

const dbConfig = {
    connectionString: conString
}

const dbClient = new pg.Client(dbConfig);
dbClient.connect();

app.use(session({
    secret: secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, // True if production
        maxAge: 3600000
    }
}));

// turn on serving static files (required for delivering css, etc. to client)
app.use(express.static(path.join(__dirname, 'public')));
// configure template engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Main page (Login) ---------------------------------------------------------------------------------------------------
app.get("/", function(req, res) {
    if (req.session.user === undefined) {
        res.render("index");
    } else {
        res.redirect("/dashboard");
    }
});

app.post("/", urlencodedParser, async function(req, res) {
    let { email, password } = req.body;
    email = email.toLowerCase();
    try {
        const dbRes = await dbClient.query("SELECT * FROM users WHERE email=$1 AND password=$2;", [email, password]);
        // Check whether login data is valid
        if (dbRes.rows.length === 0) {
            res.render("index", {
                error: "Incorrect email or password."
            });
            return;
        }
        // Assign the User-ID to the userID property within the user object in the session for authentication.
        req.session.user = {
            userID: dbRes.rows[0].id
        };
        res.redirect("/dashboard");
    } catch (error) { checkDbErr(error, res); }
});

// Signup page ---------------------------------------------------------------------------------------------------------
app.get("/signup", function(req, res) {
    if (req.session.user === undefined) {
        res.render("signup");
    } else {
        res.redirect("/dashboard");
    }
});

app.post("/signup", urlencodedParser, async function (req, res) {
    let { email, firstname, lastname, password } = req.body;
    let userinputs = [email, firstname, lastname, password];
    for (let i = 0; i < userinputs.length; i++) {
        userinputs[i] = userinputs[i].trim();
    }
    if (!validator.validate(email)) {
        displayError("Email invalid");
        return;
    }
    if ([1, 2, 3].some(index => userinputs[index] === "")) {
        displayError("Please fill in all fields.");
        return;
    }
    // Changes email to lowercase for database
    userinputs[0] = userinputs[0].toLowerCase();
    try {
        const myQuery = "INSERT INTO users(email, firstname, lastname, password) VALUES ($1, $2, $3, $4);";
        await dbClient.query(myQuery, userinputs);
        res.redirect("/");
    } catch (error) {
        // Unique constraint violation
        if (error.code === '23505') {
            res.render("signup", {
                error: "Email already in use."
            });
            return;
        }
        checkDbErr(error, res);
    }
    function displayError(errorMessage) {
        res.render("signup", { error: errorMessage });
    }
});

// Logout logic --------------------------------------------------------------------------------------------------------
app.get("/logout", function(req, res) {
    req.session.destroy();
    res.redirect("/");
});

// Dashboard with listed stations --------------------------------------------------------------------------------------
async function renderDashboard(res, userID, err) {
    try {
        const myQuery = "SELECT s.id AS stationid, s.name, s.latitude, s.longitude, s.user_fk, m.*, mo.temp AS old_temp, mo.pressure AS old_pressure, mo.windspeed AS old_windspeed, max_min.* FROM stations AS s LEFT JOIN ( SELECT     *,     ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY id DESC) AS rn FROM     measurements ) AS m ON s.id = m.station_id AND m.rn = 1 LEFT JOIN measurements mo ON s.id = mo.station_id AND mo.id = (     SELECT     MAX(id)     FROM     measurements     WHERE     station_id = s.id     AND id < (     SELECT     MAX(id)     FROM     measurements     WHERE     station_id = s.id     ) ) LEFT JOIN ( SELECT     station_id,     MAX(temp) AS max_temp,     MIN(temp) AS min_temp,     MAX(windspeed) AS max_windspeed,     MIN(windspeed) AS min_windspeed,     MAX(pressure) AS max_pressure,     MIN(pressure) AS min_pressure FROM     measurements GROUP BY     station_id ) AS max_min ON s.id = max_min.station_id WHERE s.user_fk = $1 ORDER BY s.id;";
        let dbData = await dbClient.query(myQuery, [userID]);

        // If weather station available translation of weather-codes and directions
        if (dbData.rows.length > 0) {
            for (let i = 0; i < dbData.rows.length; i++) {
                dbData.rows[i].weatherDescription = weatherAssignment.getWeather(dbData.rows[i].weather);
                dbData.rows[i].winddirection = weatherAssignment.getDirection(dbData.rows[i].winddirection);
                weatherAssignment.setTrends(dbData.rows[i]);
            }
        }
        res.render("dashboard", {
            stations: dbData.rows,
            error: err
        });
    } catch (error) { checkDbErr(error, res); }
}

app.get("/dashboard", async function (req, res) {
    if (req.session.user === undefined) {
        // Client not logged in
        res.redirect("/");
        return;
    }
    let userID = req.session.user.userID
    await renderDashboard(res, userID, undefined);
});

app.post("/dashboard", urlencodedParser, async function (req, res) {
    if (req.session.user === undefined) {
        res.redirect("/");
        return;
    }
    const userID = req.session.user.userID;
    const {name, latitude, longitude} = req.body;
    let userinputs = [name, latitude, longitude];
    // Format inputs
    for (let i = 0; i < userinputs.length; i++) {
        userinputs[i] = userinputs[i].trim();
        userinputs[i] = userinputs[i] === "" ? null : userinputs[i];
        if ((i > 0) && (userinputs[i] !== null)) {
            userinputs[i] = Number(userinputs[i].replace(",", ".")).toFixed(6);
        }
    }
    // Add the user id to the array (for sql query)
    userinputs.push(userID)
    // Check for valid name
    if (!(isValidString(userinputs[0]))) {
        let err = "Invalid station name (Max: 255 characters)";
        await renderDashboard(res, userID, err);
        return;
    }
    // Check if inputs are correct
    if (!(isValidLatitude(userinputs[1]) && isValidLongitude(userinputs[2]))) {
        let err = "Invalid coordinates (entered in decimal degrees)";
        await renderDashboard(res, userID, err);
        return;
    }
    try {
        // Add the new station to the database
        await dbClient.query("INSERT INTO stations(name, latitude, longitude, user_fk) VALUES ($1, $2, $3, $4);", userinputs);
        res.redirect("/dashboard");
    } catch (error) {
        // Unique constraint violation
        if (error.code === '23505') {
            let err = "This station already exists";
            await renderDashboard(res, userID, err);
            return;
        }
        checkDbErr(error, res);
    }
});

app.delete("/dashboard/:id", urlencodedParser, async function (req, res) {
    if (req.session.user === undefined) {
        res.redirect("/");
        return;
    }
    let stationID = Number(req.params.id);
    const userID = req.session.user.userID;
    // Check if inputs are correct
    if (isNaN(stationID)) {
        res.status(400).send("Bad Request");
        return;
    }
    try {
        // Remove the station (and all associated measurements) from the database PERMANENTLY
        await dbClient.query("DELETE FROM stations WHERE id = $1 AND user_fk = $2;", [stationID, userID]);
        res.sendStatus(200);
    } catch (error) {
        checkDbErr(error, res);
    }
});

// Station measurement details -----------------------------------------------------------------------------------------
async function renderStation(res, stationID, userID, err) {
    try {
        const dbStation = await dbClient.query("SELECT s.id AS stationid, s.name, s.latitude, s.longitude, s.user_fk, mo.temp AS old_temp, mo.pressure AS old_pressure, mo.windspeed AS old_windspeed, max_min.* FROM stations AS s LEFT JOIN measurements mo ON s.id = mo.station_id AND mo.id = ( SELECT MAX(id) FROM measurements WHERE station_id = s.id AND id < ( SELECT MAX(id) FROM measurements WHERE station_id = s.id ) ) LEFT JOIN ( SELECT station_id, MAX(temp) AS max_temp, MIN(temp) AS min_temp, MAX(windspeed) AS max_windspeed, MIN(windspeed) AS min_windspeed, MAX(pressure) AS max_pressure, MIN(pressure) AS min_pressure FROM measurements GROUP BY station_id ) AS max_min ON s.id = max_min.station_id WHERE s.id = $1 and user_fk = $2 ORDER BY s.id;", [stationID, userID]);
        if (dbStation.rows.length <= 0) {
            res.status(404).send(`Not Found: Station ${stationID} doesn't exist.`);
            return;
        }
        const dbMeasurements = await dbClient.query("select * from measurements m where station_id = $1 order by timestamp desc;", [stationID]);
        if (dbMeasurements.rows.length > 0) {
            dbStation.rows[0].weatherDescription = weatherAssignment.getWeather(dbMeasurements.rows[0].weather);
            dbStation.rows[0].windDescription = weatherAssignment.getDirection(dbMeasurements.rows[0].winddirection);
            dbStation.rows[0].temp = dbMeasurements.rows[0].temp;
            dbStation.rows[0].windspeed = dbMeasurements.rows[0].windspeed;
            dbStation.rows[0].pressure = dbMeasurements.rows[0].pressure;
            weatherAssignment.setTrends(dbStation.rows[0]);
        }
        res.render("stations", {
            station: dbStation.rows[0],
            measurements: dbMeasurements.rows,
            error: err
        });
    } catch (error) { checkDbErr(error, res); }
}

app.get("/stations/:id", async function(req, res) {
    if (req.session.user === undefined) {
        res.redirect("/");
        return;
    }
    let stationID = Number(req.params.id);
    let userID = req.session.user.userID;
    if (isNaN(stationID)) {
        res.status(400).send("Bad Request");
        return;
    }
    await renderStation(res, stationID, userID, undefined);
});

app.post("/stations/:id", urlencodedParser, async function(req, res) {
    if (req.session.user === undefined) {
        res.redirect("/");
        return;
    }
    const stationID = Number(req.params.id);
    const userID = req.session.user.userID;
    const timestamp = weatherAssignment.getTime();
    const {weather, temp, windspeed, winddirection, pressure} = req.body;
    let userinputs = [stationID, weather, temp, windspeed, winddirection, pressure, timestamp];
    let hasNaN, hasValid = false;
    // Check if station-id is numeric
    if (isNaN(stationID)) {
        res.status(400).send("Bad Request");
        return;
    }
    // Trim user input and check for non-numeric
    for (let i = 1; i < userinputs.length-1; i++) {
        userinputs[i] = userinputs[i].trim();
        if (userinputs[i] === "") {
            userinputs[i] = null;
        } else {
            userinputs[i] = Number(userinputs[i]);
            if(isNaN(userinputs[i])) {
                hasNaN = true;
            } else {
                hasValid = true;
            }
        }
    }
    // Check for correct weather-code
    if (userinputs[1] !== null && !isNaN(userinputs[1])) {
        if (weatherAssignment.getWeather(userinputs[1]) === undefined) {
            let err ="Invalid weather code";
            await renderStation(res, stationID, userID, err);
            return;
        }
    }
    // Check temperature range
    if (userinputs[2] !== null && !isNaN(userinputs[2])) {
        if (userinputs[2] > 2147483647) {
            let err = "Temperature too high";
            await renderStation(res, stationID, userID, err)
            return;
        } else if (userinputs[2] < -273.15) {
            let err = "Temperature in Celsius";
            await renderStation(res, stationID, userID, err)
            return;
        }
    }
    // Check if windspeed uses beaufortskala
    if (userinputs[3] !== null && !isNaN(userinputs[3])) {
        if (userinputs[3] < 0 || userinputs[3] > 12) {
            let err = "State wind speed in Beaufort scale";
            await renderStation(res, stationID, userID, err)
            return;
        }
    }
    // Check wind direction input type
    if (isNaN(userinputs[4])) {
        let err = "Wind direction in degrees";
        await renderStation(res, stationID, userID, err)
        return;
    }
    // No negative values for pressure
    if (userinputs[5] !== null && !isNaN(userinputs[5])) {
        if (userinputs[5] < 0) {
            let err ="Negative values are not allowed for air pressure";
            await renderStation(res, stationID, userID, err);
            return;
        }
    }
    // Verify that at least one valid reading exists and all inputs are numbers
    if (!hasValid || hasNaN) {
        let err ="Invalid input";
        await renderStation(res, stationID, userID, err);
        return;
    }
    // Degrees in the positive range [0,360[
    if (userinputs[4] !== null) {
        userinputs[4] = userinputs[4] % 360;
        if (userinputs[4] < 0) {
            userinputs[4] = userinputs[4] + 360;
        }
    }
    try {
        // Checking whether the station is from the client
        const correctUser = await dbClient.query("SELECT COUNT(*) FROM stations WHERE id = $1 AND user_fk = $2;", [stationID, userID]);
        if (!correctUser) {
            res.status(404).send(`Not Found: Station ${stationID} doesn't exist.`);
            return;
        }
        // Add the new measurement to the database
        const query = "INSERT INTO measurements(station_id, weather, temp, windspeed, winddirection, pressure, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7);";
        await dbClient.query(query, userinputs);
        res.redirect(`/stations/${stationID}`);
    } catch (error) { checkDbErr(error, res); }
});

app.delete("/stations/:id", urlencodedParser, async function(req, res) {
    if (req.session.user === undefined) {
        res.redirect("/");
        return;
    }
    const measurementID = Number(req.params.id);
    const userID = req.session.user.userID;
    // Check if inputs are correct
    if (isNaN(measurementID)) {
        res.status(400).send("Bad Request");
        return;
    }
    try {
        const correctUser = await dbClient.query("SELECT users.id FROM users JOIN stations ON stations.user_fk = users.id JOIN measurements ON measurements.station_id = stations.id WHERE measurements.id = $1;", [measurementID]);
        if (correctUser.rows.length === 0 || correctUser.rows[0].id !== userID) {
            res.status(404).send(`Not Found: Station ${measurementID} doesn't exist.`);
            return;
        }
        await dbClient.query("DELETE FROM measurements WHERE id = $1;", [measurementID]);
        res.sendStatus(200);
    } catch (error) { checkDbErr(error, res); }
});

// Add data from external api ------------------------------------------------------------------------------------------
app.post("/addfromapi/:id", async function(req, res) {
    if (req.session.user === undefined) {
        res.redirect("/");
        return;
    }
    const stationID = Number(req.params.id);
    const userID = req.session.user.userID;
    const timestamp = weatherAssignment.getTime();
    let latitude, longitude;
    let code, temp, windspeed, winddirection, pressure;
    try {
        const dbRes = await dbClient.query("SELECT latitude, longitude FROM stations WHERE id = $1 AND user_fk = $2;", [stationID, userID]);
        if (!dbRes) {
            res.status(400).send(`Error`);
            return;
        }
        latitude = dbRes.rows[0].latitude;
        longitude = dbRes.rows[0].longitude;
    } catch (error) { checkDbErr(error, res); }
    try {
        const apiData = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apikey}`).catch();
        code = apiData.data.weather[0].id;
        temp = Number((-273.15 + apiData.data.main.temp).toFixed(2));
        pressure = apiData.data.main.pressure;
        windspeed = apiData.data.wind.speed;
        winddirection = apiData.data.wind.deg;
        res.redirect(`/stations/${stationID}`);
    } catch (error) { res.status(500).json({ error: 'API request failed' }); }
    try {
        const query = "INSERT INTO measurements(station_id, weather, temp, windspeed, winddirection, pressure, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7);";
        await dbClient.query(query, [stationID, code, temp, windspeed, winddirection, pressure, timestamp]);
    } catch (error) { checkDbErr(error, res); }
});

app.listen(PORT, function() {
    console.log(`Weatherlog running and listening on port ${PORT}`);
});

function checkDbErr(error, res) {
    if (error.code === '22003') {
        res.status(400).send("Error: out of range");
        return;
    }
    console.error(error);
    res.status(500).send("Internal Server Error");
}

function isValidString(str) {
    if (str === null) return false;
    return str.length <= 255;
}
function isValidLatitude(str) {
    const regex = /^(-?\d{1,2}\.\d{6})?$/;
    return regex.test(str) && Math.abs(Number(str)) <= 180;
}
function isValidLongitude(str) {
    const regex = /^(-?\d{1,3}\.\d{6})?$/;
    return regex.test(str) && Math.abs(Number(str)) <= 90;
}
