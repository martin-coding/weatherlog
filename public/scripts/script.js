function deleteStation(stationId, event) {
    event.preventDefault();

    fetch(`/dashboard/${stationId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                location.reload();
            } else {
                console.error('An error occurred while deleting the weather station.');
            }
        })
        .catch(error => {
            console.error('Error attempting to delete weather station:', error);
        });
}

function deleteMeasurement(measurementId, event) {
    event.preventDefault();

    fetch(`/stations/${measurementId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                location.reload();
            } else {
                console.error('An error occurred while deleting the measurement.');
            }
        })
        .catch(error => {
            console.error('Error attempting to delete the measurement:', error);
        });
}
