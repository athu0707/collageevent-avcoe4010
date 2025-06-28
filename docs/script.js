// ======================
// CONSTANTS
// ======================
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "admin123"
};

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ======================
// CALENDAR MANAGEMENT
// ======================
class CalendarManager {
  constructor() {
    this.currentDate = new Date();
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
  }

  renderCalendar() {
    const calendarGrid = document.getElementById("calendar-grid");
    const monthYearDisplay = document.getElementById("current-month-year");

    calendarGrid.innerHTML = "";
    monthYearDisplay.textContent = `${MONTH_NAMES[this.currentMonth]} ${this.currentYear}`;

    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();

    // Headers
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
      const header = document.createElement("div");
      header.className = "calendar-day-header";
      header.textContent = day;
      calendarGrid.appendChild(header);
    });

    // Previous month fillers
    const prevDays = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      const day = document.createElement("div");
      day.className = "calendar-day empty";
      day.textContent = prevDays - firstDay + i + 1;
      calendarGrid.appendChild(day);
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const day = document.createElement("div");
      day.className = "calendar-day";

      const date = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const dayNumber = document.createElement("div");
      dayNumber.className = "calendar-day-number";
      dayNumber.textContent = i;

      // Event logic
      const events = StorageManager.getEventsByDate(date);
      if (events.length > 0) {
        const dot = document.createElement("span");
        dot.className = "event-dot";
        dayNumber.appendChild(dot);
      }

      day.appendChild(dayNumber);
      day.addEventListener("click", () => this.showEventsModal(date));
      calendarGrid.appendChild(day);
    }
  }

  showEventsModal(dateStr) {
    const modal = document.getElementById("events-modal");
    const title = document.getElementById("modal-date-title");
    const list = document.getElementById("events-list");

    const events = StorageManager.getEventsByDate(dateStr);
    list.innerHTML = "";
    title.textContent = new Date(dateStr).toDateString();

    if (events.length === 0) {
      list.innerHTML = `<p>No events found for this date.</p>`;
    } else {
      events.forEach(event => {
        const div = document.createElement("div");
        div.className = "event-item";
        div.innerHTML = `
          <h3>${event.name}</h3>
          <p>${event.summary || event.description}</p>
          ${event.image ? `<img src="${event.image}" alt="${event.name}" style="max-width:100%">` : ""}
        `;
        list.appendChild(div);
      });
    }

    modal.style.display = "block";
  }

  navigateMonth(dir) {
    if (dir === "prev") {
      this.currentMonth--;
      if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
      }
    } else {
      this.currentMonth++;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear++;
      }
    }
    this.renderCalendar();
  }
}

// ======================
// STORAGE MANAGEMENT
// ======================
class StorageManager {
  static getEvents() {
    return JSON.parse(localStorage.getItem("events")) || {};
  }

  static getEventsByDate(date) {
    const all = this.getEvents();
    return all[date] || [];
  }

  static saveEvent(date, event) {
    const events = this.getEvents();
    if (!events[date]) events[date] = [];
    events[date].push(event);
    localStorage.setItem("events", JSON.stringify(events));
  }
}

// ======================
// IMAGE GALLERY
// ======================
async function loadGalleryImages() {
  const container = document.getElementById("events-folder-view");
  if (!container) return;

  const res = await fetch("http://localhost:3000/api/events");
  const events = await res.json();

  container.innerHTML = "";
  events.forEach(event => {
    if (event.image) {
      const card = document.createElement("div");
      card.className = "event-card";
      card.innerHTML = `
        <img src="${event.image}" width="100%" alt="Event Image" />
        <strong>${event.name}</strong><br>
        📅 ${new Date(event.date).toLocaleDateString()}<br>
        📝 ${event.description}
      `;
      container.appendChild(card);
    }
  });
}

// ======================
// ADMIN LOGIN
// ======================
if (document.getElementById("admin-login")) {
  document.getElementById("admin-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("username").value;
    const p = document.getElementById("password").value;

    if (u === ADMIN_CREDENTIALS.username && p === ADMIN_CREDENTIALS.password) {
      sessionStorage.setItem("adminLoggedIn", "true");
      window.location.href = "admin-panel.html";
    } else {
      alert("Invalid admin credentials");
    }
  });
}

// ======================
// IMAGE UPLOAD FORM
// ======================
if (document.getElementById("uploadImageForm")) {
  document.getElementById("uploadImageForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const eventId = document.getElementById("eventId").value.trim();
    const imageFile = document.getElementById("image").files[0];

    if (!eventId || !imageFile) {
      alert("Please enter Event ID and select an image.");
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const res = await fetch(`http://localhost:3000/api/events/${eventId}/image`, {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ Image uploaded successfully!");
      } else {
        alert("❌ " + (result.error || "Image upload failed"));
      }
    } catch (err) {
      console.error("❌ Error uploading image:", err);
      alert("Error uploading image. Check console for details.");
    }
  });
}

// ======================
// TIME + WEATHER
// ======================
function updateTime() {
  const now = new Date();
  const timeContainer = document.querySelector("#time .info-text");
  if (timeContainer) {
    timeContainer.textContent = now.toLocaleTimeString();
  }
}

async function fetchWeather() {
  try {
    const res = await fetch("https://api.openweathermap.org/data/2.5/weather?q=Sangamner,IN&units=metric&appid=9812a2cd7527c37af7e50ac1e85c981d");
    const data = await res.json();
    const weatherBox = document.querySelector("#weather .info-text");
    if (weatherBox) {
      weatherBox.textContent = `${data.main.temp}°C, ${data.weather[0].main}`;
    }
  } catch {
    const weatherBox = document.querySelector("#weather .info-text");
    if (weatherBox) {
      weatherBox.textContent = "Weather unavailable";
    }
  }
}

// ======================
// INITIALIZATION
// ======================
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("calendar-grid")) {
    const cal = new CalendarManager();
    cal.renderCalendar();
    document.getElementById("prev-month").addEventListener("click", () => cal.navigateMonth("prev"));
    document.getElementById("next-month").addEventListener("click", () => cal.navigateMonth("next"));
    document.querySelector(".close-modal").addEventListener("click", () => {
      document.getElementById("events-modal").style.display = "none";
    });
  }

  if (document.getElementById("events-folder-view")) {
    loadGalleryImages();
  }

  fetchWeather();
  setInterval(updateTime, 1000);
});
