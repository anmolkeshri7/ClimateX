// ========================================
// ClimateX — Weather Intelligence
// Step 12: Celsius / Fahrenheit Conversion
// ========================================

const API_URL = "https://api.openweathermap.org/data/2.5/weather";

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

// Weather card elements
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

// Temperature toggle buttons
const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");

// Store the last successfully searched city
let lastSearchedCity = "";

// Store original temperatures in Celsius
let currentTempCelsius = null;
let feelsLikeCelsius = null;

// Selected temperature unit
let currentUnit = "C";

// Display an error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

// Clear previous errors
function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

// Display loading feedback
function showLoading() {
    loading.hidden = false;
    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";
}

// Hide loading feedback
function hideLoading() {
    loading.hidden = true;
    searchBtn.disabled = false;
    searchBtn.innerHTML = 'Search <span aria-hidden="true">→</span>';
}

// Basic city-name validation
function isValidCity(city) {
    return /^[a-zA-ZÀ-ÿ\s.'-]+$/.test(city);
}

// Update the live date and time
function updateDateTime() {
    if (!currentDateTime) return;

    const now = new Date();

    currentDateTime.textContent = now.toLocaleString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

// Convert Celsius to Fahrenheit
function toFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
}

// Update the temperature unit toggle appearance
function updateToggleButtons() {
    const isCelsius = currentUnit === "C";

    celsiusBtn.classList.toggle("active", isCelsius);
    fahrenheitBtn.classList.toggle("active", !isCelsius);

    celsiusBtn.setAttribute("aria-pressed", String(isCelsius));
    fahrenheitBtn.setAttribute("aria-pressed", String(!isCelsius));
}

// Render temperatures in the selected unit
function renderTemperatures() {
    if (currentTempCelsius === null || feelsLikeCelsius === null) {
        return;
    }

    let displayedTemp;
    let displayedFeelsLike;
    let unitSymbol;

    if (currentUnit === "C") {
        displayedTemp = currentTempCelsius;
        displayedFeelsLike = feelsLikeCelsius;
        unitSymbol = "°C";
    } else {
        displayedTemp = toFahrenheit(currentTempCelsius);
        displayedFeelsLike = toFahrenheit(feelsLikeCelsius);
        unitSymbol = "°F";
    }

    temperature.textContent = Math.round(displayedTemp);
    temperatureUnit.textContent = unitSymbol;
    feelsLike.textContent = `${Math.round(displayedFeelsLike)}${unitSymbol}`;

    updateToggleButtons();
}

// Switch to Celsius
celsiusBtn.addEventListener("click", () => {
    currentUnit = "C";
    renderTemperatures();
});

// Switch to Fahrenheit
fahrenheitBtn.addEventListener("click", () => {
    currentUnit = "F";
    renderTemperatures();
});

// Request current weather from OpenWeatherMap
async function handleSearch(cityOverride = "") {
    const city = (cityOverride || cityInput.value).trim();

    clearError();

    if (city === "") {
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
        showError(
            "API key missing. Add your key in config.js and save the file."
        );
        return;
    }

    showLoading();
    weatherCard.hidden = true;
    emptyState.hidden = true;

    try {
        const url =
            `${API_URL}?q=${encodeURIComponent(city)}` +
            `&appid=${API_KEY}&units=metric`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 400) {
                throw new Error("Invalid request. Check the city name.");
            }

            if (response.status === 401) {
                throw new Error(
                    "OpenWeatherMap rejected the API key. It may still be activating or may be invalid. Please try again later."
                );
            }

            if (response.status === 404) {
                throw new Error(
                    "City not found. Check the spelling and try again."
                );
            }

            if (response.status === 429) {
                throw new Error(
                    "API request limit reached. Try again later."
                );
            }

            throw new Error(
                data.message || "Unable to fetch weather data."
            );
        }

        displayWeather(data);
        lastSearchedCity = city;

    } catch (error) {
        console.error("ClimateX weather request failed:", error);

        if (error instanceof TypeError) {
            showError(
                "Network error. Check your internet connection and try again."
            );
        } else {
            showError(
                error.message || "Something went wrong. Please try again."
            );
        }

        weatherCard.hidden = true;
        emptyState.hidden = false;

    } finally {
        hideLoading();
    }
}

// Display weather information
function displayWeather(data) {
    cityName.textContent = data.name;
    countryName.textContent = data.sys.country;

    // Save original API temperatures in Celsius
    currentTempCelsius = data.main.temp;
    feelsLikeCelsius = data.main.feels_like;

    // Preserve the user's selected unit
    renderTemperatures();

    condition.textContent = data.weather[0].description;
    humidity.textContent = `${data.main.humidity}%`;
    wind.textContent = `${data.wind.speed} m/s`;

    const iconCode = data.weather[0].icon;

    weatherIcon.src =
        `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    weatherIcon.alt = data.weather[0].description;

    updateDateTime();

    weatherCard.hidden = false;
    emptyState.hidden = true;
}

// Submit city search
weatherForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSearch();
});

// Refresh the last successfully searched city
refreshBtn.addEventListener("click", () => {
    if (lastSearchedCity) {
        handleSearch(lastSearchedCity);
    } else {
        handleSearch();
    }
});

// Initialize date/time and unit toggle
updateDateTime();
updateToggleButtons();

setInterval(updateDateTime, 60000);