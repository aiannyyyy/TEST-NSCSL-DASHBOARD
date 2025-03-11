document.addEventListener("DOMContentLoaded", function () {
    const eventForm = document.getElementById("eventForm");
    const eventsList = document.getElementById("eventsList");
    const allEventsList = document.getElementById("allEventsList");
    let events = [];

    function addEvent() {
        const eventName = document.getElementById("eventName").value;
        const eventLocation = document.getElementById("eventLocation").value;
        const eventDateTime = document.getElementById("eventDateTime").value;
        const eventDescription = document.getElementById("eventDescription").value;
        const eventHost = document.getElementById("eventHost").value;

        if (eventName && eventLocation && eventDateTime && eventDescription && eventHost) {
            const event = {
                name: eventName,
                location: eventLocation,
                dateTime: eventDateTime,
                description: eventDescription,
                host: eventHost
            };
            
            events.push(event);
            displayEvents();
            eventForm.reset();
            bootstrap.Modal.getInstance(document.getElementById("addEventModal")).hide();
        } else {
            alert("Please fill out all fields.");
        }
    }

    function displayEvents() {
        eventsList.innerHTML = "";
        allEventsList.innerHTML = "";

        events.forEach((event, index) => {
            let eventItem = `<div class='mb-3 p-2 border rounded'>
                                <h6 class='fw-bold mb-1'>${event.name}</h6>
                                <p class='mb-1'><strong>Location:</strong> ${event.location}</p>
                                <p class='mb-1'><strong>Date & Time:</strong> ${new Date(event.dateTime).toLocaleString()}</p>
                                <p class='mb-1'><strong>Host:</strong> ${event.host}</p>
                                <p class='mb-1'><strong>Description:</strong> ${event.description}</p>
                                <button class='btn btn-danger btn-sm' onclick='deleteEvent(${index})'>Delete</button>
                            </div>`;
            
            if (index < 3) {
                eventsList.innerHTML += eventItem;
            }
            allEventsList.innerHTML += eventItem;
        });
    }

    function deleteEvent(index) {
        events.splice(index, 1);
        displayEvents();
    }

    window.addEvent = addEvent;
    window.showAllEvents = displayEvents;
    window.deleteEvent = deleteEvent;
});
