function getTime() {
    const jsDate = new Date(); // Current JavaScript Date object

    // Get date parts
    const year = jsDate.getFullYear();
    const month = ('0' + (jsDate.getMonth() + 1)).slice(-2); // January is 0
    const day = ('0' + jsDate.getDate()).slice(-2);
    const hours = ('0' + jsDate.getHours()).slice(-2);
    const minutes = ('0' + jsDate.getMinutes()).slice(-2);
    const seconds = ('0' + jsDate.getSeconds()).slice(-2);

    // Convert time zone offset to hours and minutes
    const timezoneOffsetMinutes = jsDate.getTimezoneOffset();
    const timezoneOffsetHours = Math.floor(Math.abs(timezoneOffsetMinutes) / 60);
    const timezoneOffsetMinutesFormatted = Math.abs(timezoneOffsetMinutes) % 60;
    const timezoneSign = timezoneOffsetMinutes < 0 ? '+' : '-';

    // return date in database format with time zone
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${timezoneSign}${('0' + timezoneOffsetHours).slice(-2)}:${('0' + timezoneOffsetMinutesFormatted).slice(-2)}`;
}

function getDirection(angle) {
    if (angle === null) {
        return null;
    } else if (angle >= 348.75 || angle < 11.25) {
        return 'N';
    } else if (angle >= 11.25 && angle < 33.75) {
        return 'NNE';
    } else if (angle >= 33.75 && angle < 56.25) {
        return 'NE';
    } else if (angle >= 56.25 && angle < 78.75) {
        return 'ENE';
    } else if (angle >= 78.75 && angle < 101.25) {
        return 'E';
    } else if (angle >= 101.25 && angle < 123.75) {
        return 'ESE';
    } else if (angle >= 123.75 && angle < 146.25) {
        return 'SE';
    } else if (angle >= 146.25 && angle < 168.75) {
        return 'SSE';
    } else if (angle >= 168.75 && angle < 191.25) {
        return 'S';
    } else if (angle >= 191.25 && angle < 213.75) {
        return 'SSW';
    } else if (angle >= 213.75 && angle < 236.25) {
        return 'SW';
    } else if (angle >= 236.25 && angle < 258.75) {
        return 'WSW';
    } else if (angle >= 258.75 && angle < 281.25) {
        return 'W';
    } else if (angle >= 281.25 && angle < 303.75) {
        return 'WNW';
    } else if (angle >= 303.75 && angle < 326.25) {
        return 'NW';
    } else if (angle >= 326.25 && angle < 348.75) {
        return 'NNW';
    } else {
        return null;
    }
}

function getWeather(code) {
    const codePrefix = Math.floor(code / 100);
    switch (codePrefix) {
        case 2:
            return "Thunderstorm";
        case 3:
            return "Drizzle";
        case 5:
            return "Rain";
        case 6:
            return "Snow";
        case 8:
            return "Clear";
        default:
            return undefined;
    }
}

function setTrends(dataRow) {
    if (dataRow.old_temp === null || dataRow.old_temp === dataRow.temp) {
        dataRow.tempTrend = 0;
    } else if (dataRow.old_temp < dataRow.temp) {
        dataRow.tempTrend = 1;
    } else if (dataRow.old_temp > dataRow.temp) {
        dataRow.tempTrend = -1;
    }
    if (dataRow.old_windspeed === null || dataRow.old_windspeed === dataRow.windspeed) {
        dataRow.windspeedTrend = 0;
    } else if (dataRow.old_windspeed < dataRow.windspeed) {
        dataRow.windspeedTrend = 1;
    } else if (dataRow.old_windspeed > dataRow.windspeed) {
        dataRow.windspeedTrend = -1;
    }
    if (dataRow.old_pressure === null || dataRow.old_pressure === dataRow.pressure) {
        dataRow.pressureTrend = 0;
    } else if (dataRow.old_pressure < dataRow.pressure) {
        dataRow.pressureTrend = 1;
    } else if (dataRow.old_pressure > dataRow.pressure) {
        dataRow.pressureTrend = -1;
    }
}

module.exports = {
    getTime,
    getDirection,
    getWeather,
    setTrends
}
