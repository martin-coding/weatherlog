const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const pg = require("pg");

/* Reading global variables from config file */
dotenv.config();
const PORT = process.env.PORT;
const conString = process.env.DB_CON_STRING;

app = express();

const dbConfig = {
    connectionString: conString
}
const dbClient = new pg.Client(dbConfig);
dbClient.connect();

app.use(express.static(path.join(__dirname, 'public')));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.get("/", function(request, response) {
    response.render("index");
});

app.get("/dashboard", function(request, response) {
	const myQuery = "select m1.station_id, stations.name, m1.weather, m1.temperature, m1.windspeed, m1.pressure from readings m1 join (select max(id) id,station_id from readings t2 group by station_id) m2 on m1.station_id=m2.station_id and m1.id = m2.id join stations on m1.station_id = stations.id order by station_id /*desc*/;";
    dbClient.query(myQuery, function (dbError, dbItemsResponse) {
		response.render("dashboard", {
			stations: dbItemsResponse.rows
		});
    });
});

app.get("/stations/:id", function(request, response) {
    let stationID = request.params.id;
	const myQuery = "select name, weather, temperature, windspeed, pressure from readings join stations on readings.station_id = stations.id where station_id = $1 order by readings.id desc;"
    dbClient.query(myQuery, [stationID], function (dbError, dbItemsResponse) {
        if (dbItemsResponse.rows.length !== 0) {
            response.render("stations", {
                latest_reading: dbItemsResponse.rows[0],
                readings: dbItemsResponse.rows
            });
        } else {
            response.status(404).send(`Not Found: Station ${stationID} does not exist.`);
        }
    });
});

app.listen(PORT, function() {
  console.log(`Weatherlog running and listening on port ${PORT}`);
});