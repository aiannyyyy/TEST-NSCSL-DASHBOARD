document.addEventListener("DOMContentLoaded", function () {
    const eventForm = document.getElementById("eventForm");
    const eventsList = document.getElementById("eventsList");
    const allEventsList = document.getElementById("allEventsList");

    // ✅ Load Events from Local Storage on Page Load
    displayEvents();

    // 📌 Function to Add New Event
    function addEvent() {
        const eventName = document.getElementById("eventName").value;
        const eventLocation = document.getElementById("eventLocation").value;
        const eventDateTime = document.getElementById("eventDateTime").value;
        const eventDescription = document.getElementById("eventDescription").value;
        const eventHost = document.getElementById("eventHost").value;

        if (eventName && eventLocation && eventDateTime && eventDescription && eventHost) {
            const event = {
                id: Date.now(), // Unique ID for each event
                name: eventName,
                location: eventLocation,
                dateTime: eventDateTime,
                description: eventDescription,
                host: eventHost
            };

            let events = JSON.parse(localStorage.getItem("events")) || [];
            events.push(event);
            localStorage.setItem("events", JSON.stringify(events)); // ✅ Save to localStorage

            displayEvents();
            eventForm.reset();
            bootstrap.Modal.getInstance(document.getElementById("addEventModal")).hide();
        } else {
            alert("Please fill out all fields.");
        }
    }

    // 📌 Function to Display Events
    function displayEvents() {
        let events = JSON.parse(localStorage.getItem("events")) || [];
        eventsList.innerHTML = "";
        allEventsList.innerHTML = "";

        if (events.length === 0) {
            eventsList.innerHTML = "<p class='text-muted text-center'>No events available</p>";
            allEventsList.innerHTML = "<p class='text-muted text-center'>No events available</p>";
            return;
        }

        events.forEach((event, index) => {
            let eventItem = `<div class='mb-3 p-2 border rounded'>
                                <h6 class='fw-bold mb-1'>${event.name}</h6>
                                <p class='mb-1'><strong>Location:</strong> ${event.location}</p>
                                <p class='mb-1'><strong>Date & Time:</strong> ${new Date(event.dateTime).toLocaleString()}</p>
                                <p class='mb-1'><strong>Host:</strong> ${event.host}</p>
                                <p class='mb-1'><strong>Description:</strong> ${event.description}</p>
                                <button class='btn btn-danger btn-sm' onclick='deleteEvent(${event.id})'>Delete</button>
                            </div>`;

            if (index < 3) {
                eventsList.innerHTML += eventItem;
            }
            allEventsList.innerHTML += eventItem;
        });
    }

    // 📌 Function to Delete Event
    function deleteEvent(eventId) {
        let events = JSON.parse(localStorage.getItem("events")) || [];
        events = events.filter(event => event.id !== eventId);
        localStorage.setItem("events", JSON.stringify(events)); // ✅ Update localStorage

        displayEvents();
    }

    // ✅ Ensure deleteEvent is accessible globally
    window.addEvent = addEvent;
    window.showAllEvents = displayEvents;
    window.deleteEvent = deleteEvent;
});
