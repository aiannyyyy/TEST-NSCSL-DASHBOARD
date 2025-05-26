function computeJulianDate() {
    const dateInput = document.getElementById("datePicker").value;
    if (!dateInput) return;
    
    const selectedDate = new Date(dateInput);
    if (isNaN(selectedDate)) return;

    const startOfYear = new Date(selectedDate.getFullYear(), 0, 1);
    const diff = selectedDate - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    let julianDate = Math.floor(diff / oneDay) + 1;

    // Ensure Julian Date is always 3 digits
    julianDate = String(julianDate).padStart(3, '0');

    document.getElementById("julianDateDisplay").textContent = julianDate;
}

function computeCalendarDate() {
    let julianDay = document.getElementById("julianInput").value.trim();
    const year = parseInt(document.getElementById("yearInput").value, 10);

    if (!julianDay || isNaN(year) || julianDay < 1 || julianDay > 366) return;

    // Ensure Julian Day is always three digits
    julianDay = String(julianDay).padStart(3, '0');

    // Correct calculation without timezone issues
    const date = new Date(year, 0, parseInt(julianDay, 10));

    // Format the date properly (YYYY-MM-DD) without timezone shifts
    const formattedDate = date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0');

    document.getElementById("calendarDateDisplay").textContent = formattedDate;
}
