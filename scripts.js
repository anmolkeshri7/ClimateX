// ========================================
// ClimateX — Weather Intelligence
// Step 14: Five-day weather forecast
// ========================================

const API_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// Search elements
const weatherForm = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const refreshBtn = document.getElementById("refreshBtn");

// Feedback elements
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const weatherCard = document.getElementById("weatherCard");
const emptyState = document.getElementById("emptyState");

// Current weather elements
const cityName = document.getElementById("cityName");
const countryName = document.getElementById("countryName");
const currentDateTime = document.getElementById("currentDateTime");
const temperature = document.getElementById("temperature");
const temperatureUnit = document.getElementById("temperatureUnit");
const condition = document.getElementById("condition");
const humidity = document.getElementById("humidity");
const feelsLike = document.getElementById("feelsLike");
const wind = document.getElementById("wind");
const weatherIcon = document.getElementById("weatherIcon");

// Temperature unit buttons
const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");

// Forecast elements
const forecastSection = document.getElementById("forecastSection");
const forecastGrid = document.getElementById("forecastGrid");
const forecastLocation = document.getElementById("forecastLocation");

// Application state
let lastSearchedCity = "";
let currentTempCelsius = null;
let feelsLikeCelsius = null;
let currentUnit = "C";
let forecastDays = [];

// Error display
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

// Loading state
function showLoading() {
    loading.hidden = false;
    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";
}

function hideLoading() {
    loading.hidden = true;
    searchBtn.disabled = false;
    searchBtn.innerHTML = 'Search <span aria-hidden="true">→</span>';
}

// City validation
function isValidCity(city) {
    return /^[a-zA-ZÀ-ÿ\s.'-]+$/.test(city);
}

// Live date and time
function updateDateTime() {
    if (!currentDateTime) return;

    currentDateTime.textContent = new Date().toLocaleString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

// Temperature conversion
function toFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
}

function formatTemperature(celsius) {
    const value = currentUnit === "C"
        ? celsius
        : toFahrenheit(celsius);

    return `${Math.round(value)}°`;
}

function updateToggleButtons() {
    const isCelsius = currentUnit === "C";

    celsiusBtn.classList.toggle("active", isCelsius);
    fahrenheitBtn.classList.toggle("active", !isCelsius);

    celsiusBtn.setAttribute("aria-pressed", String(isCelsius));
    fahrenheitBtn.setAttribute("aria-pressed", String(!isCelsius));
}

function renderTemperatures() {
    if (currentTempCelsius === null || feelsLikeCelsius === null) {
        return;
    }

    temperature.textContent = Math.round(
        currentUnit === "C"
            ? currentTempCelsius
            : toFahrenheit(currentTempCelsius)
    );

    temperatureUnit.textContent = currentUnit === "C" ? "°C" : "°F";

    feelsLike.textContent =
        `${Math.round(currentUnit === "C" ? feelsLikeCelsius : toFahrenheit(feelsLikeCelsius))}` +
        (currentUnit === "C" ? "°C" : "°F");

    updateToggleButtons();
    renderForecast();
}

// Fetch JSON with clearer network and HTTP error handling
async function fetchJSON(url) {
    let response;

    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error(
            "Network error. Check your internet connection and try again."
        );
    }

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error("The weather service returned an unreadable response.");
    }

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error(
                "OpenWeatherMap rejected the API key. Check that it is active and authorized for the forecast endpoint."
            );
        }

        if (response.status === 404) {
            throw new Error("City not found. Check the spelling and try again.");
        }

        if (response.status === 429) {
            throw new Error("API request limit reached. Try again later.");
        }

        throw new Error(data.message || "Unable to fetch weather data.");
    }

    return data;
}

// Fetch current weather and forecast
async function handleSearch(cityOverride = "") {
    const city = (cityOverride || cityInput.value).trim();

    clearError();

    if (!city) {
        showError("Please enter a city name.");
        cityInput.focus();
        return;
    }

    if (!isValidCity(city)) {
        showError("Please enter a valid city name using letters.");
        cityInput.focus();
        return;
    }

    if (
        typeof API_KEY === "undefined" ||
        !API_KEY ||
        API_KEY === "YOUR_OPENWEATHER_API_KEY"
    ) {
        showError("API key missing. Add your key in config.js.");
        return;
    }

    showLoading();
    weatherCard.hidden = true;
    forecastSection.hidden = true;
    emptyState.hidden = true;

    try {
        const query = `q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

        // Request both endpoints together
        const [currentData, forecastData] = await Promise.all([
            fetchJSON(`${API_URL}?${query}`),
            fetchJSON(`${FORECAST_URL}?${query}`)
        ]);

        displayWeather(currentData);
        prepareForecast(forecastData);

        lastSearchedCity = city;

    } catch (error) {
        console.error("ClimateX weather request failed:", error);

        showError(error.message || "Something went wrong. Please try again.");

        weatherCard.hidden = true;
        forecastSection.hidden = true;
        emptyState.hidden = false;

    } finally {
        hideLoading();
    }
}

// Display current weather
function displayWeather(data) {
    cityName.textContent = data.name;
    countryName.textContent = data.sys.country;

    currentTempCelsius = data.main.temp;
    feelsLikeCelsius = data.main.feels_like;

    condition.textContent = data.weather[0].description;
    humidity.textContent = `${data.main.humidity}%`;
    wind.textContent = `${data.wind.speed} m/s`;

    weatherIcon.src =
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    weatherIcon.alt = data.weather[0].description;

    updateDateTime();
    renderTemperatures();

    weatherCard.hidden = false;
    emptyState.hidden = true;
}

// Get the forecast's local date using its UTC timestamp and city timezone offset
function getLocalForecastDate(timestamp, timezoneOffset) {
    const localTimestamp = (timestamp + timezoneOffset) * 1000;
    return new Date(localTimestamp).toISOString().slice(0, 10);
}

// Get a local hour for a forecast interval
function getLocalForecastHour(timestamp, timezoneOffset) {
    const localTimestamp = (timestamp + timezoneOffset) * 1000;
    return new Date(localTimestamp).getUTCHours();
}

// Prepare daily forecast data from three-hour intervals
function prepareForecast(data) {
    const timezoneOffset = data.city.timezone;
    const groupedDays = new Map();

    for (const item of data.list) {
        const dateKey = getLocalForecastDate(item.dt, timezoneOffset);
        const localHour = getLocalForecastHour(item.dt, timezoneOffset);

        if (!groupedDays.has(dateKey)) {
            groupedDays.set(dateKey, []);
        }

        groupedDays.get(dateKey).push({
            item,
            localHour
        });
    }

    const todayKey = getLocalForecastDate(
        Math.floor(Date.now() / 1000),
        timezoneOffset
    );

    forecastDays = [];

    for (const [dateKey, entries] of groupedDays.entries()) {
        // Exclude today's partial forecast to show the next five calendar days
        if (dateKey <= todayKey) continue;

        const temps = entries.map(entry => entry.item.main.temp);
        const high = Math.max(...temps);
        const low = Math.min(...temps);

        // Prefer an interval close to midday for representative conditions
        const daytimeEntries = entries.filter(
            entry => entry.localHour >= 11 && entry.localHour <= 15
        );

        const candidates = daytimeEntries.length ? daytimeEntries : entries;
        const representative = candidates.reduce((best, current) => {
            const bestDistance = Math.abs(best.localHour - 12);
            const currentDistance = Math.abs(current.localHour - 12);

            return currentDistance < bestDistance ? current : best;
        });

        const averageHumidity = Math.round(
            entries.reduce((sum, entry) => sum + entry.item.main.humidity, 0) /
            entries.length
        );

        forecastDays.push({
            date: dateKey,
            high,
            low,
            humidity: averageHumidity,
            condition: representative.item.weather[0].description,
            icon: representative.item.weather[0].icon
        });

        if (forecastDays.length === 5) break;
    }

    forecastLocation.textContent = `${data.city.name}, ${data.city.country}`;
    renderForecast();

    forecastSection.hidden = forecastDays.length === 0;
}

// Display forecast cards safely
function renderForecast() {
    forecastGrid.replaceChildren();

    forecastDays.forEach((day, index) => {
        const date = new Date(`${day.date}T12:00:00Z`);

        const dayName = date.toLocaleDateString("en-IN", {
            weekday: "short",
            timeZone: "UTC"
        });

        const dateLabel = date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "UTC"
        });

        const card = document.createElement("article");
        card.className = "forecast-card";

        const heading = document.createElement("h3");
        heading.className = "forecast-day";
        heading.textContent = index === 0 ? "Tomorrow" : dayName;

        const dateElement = document.createElement("p");
        dateElement.className = "forecast-date";
        dateElement.textContent = dateLabel;

        const icon = document.createElement("img");
        icon.className = "forecast-icon";
        icon.src = `https://openweathermap.org/img/wn/${day.icon}@2x.png`;
        icon.alt = day.condition;
        icon.loading = "lazy";

        const description = document.createElement("p");
        description.className = "forecast-condition";
        description.textContent = day.condition;

        const temperatures = document.createElement("div");
        temperatures.className = "forecast-temperatures";

        const high = document.createElement("span");
        high.className = "forecast-high";
        high.textContent = formatTemperature(day.high);

        const low = document.createElement("span");
        low.className = "forecast-low";
        low.textContent = formatTemperature(day.low);

        temperatures.append(high, low);

        const humidityElement = document.createElement("p");
        humidityElement.className = "forecast-humidity";
        humidityElement.textContent = `💧 ${day.humidity}%`;

        card.append(
            heading,
            dateElement,
            icon,
            description,
            temperatures,
            humidityElement
        );

        forecastGrid.appendChild(card);
    });
}

// Temperature unit events
celsiusBtn.addEventListener("click", () => {
    currentUnit = "C";
    renderTemperatures();
});

fahrenheitBtn.addEventListener("click", () => {
    currentUnit = "F";
    renderTemperatures();
});

// Search form event
weatherForm.addEventListener("submit", event => {
    event.preventDefault();
    handleSearch();
});

// Refresh current city and forecast
refreshBtn.addEventListener("click", () => {
    handleSearch(lastSearchedCity || cityInput.value);
});

// Initialize interface
updateDateTime();
updateToggleButtons();
setInterval(updateDateTime, 60000);