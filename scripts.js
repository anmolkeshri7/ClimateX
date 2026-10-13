// ========================================
// ClimateX — Weather Intelligence
// OpenWeatherMap API integration
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
const condition = document.getElementById("condition");
const humidity = document.getElementById("humidity");
const feelsLike = document.getElementById("feelsLike");
const wind = document.getElementById("wind");
const weatherIcon = document.getElementById("weatherIcon");

// Store the last successfully searched city
let lastSearchedCity = "";

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
                    "OpenWeatherMap rejected the API key. It may be inactive or invalid. Please wait for activation and try again."
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
            showError(error.message || "Something went wrong. Please try again.");
        }

        weatherCard.hidden = true;
        emptyState.hidden = false;

    } finally {
        hideLoading();
    }
}

// Fill the weather card using API data
function displayWeather(data) {
    cityName.textContent = data.name;
    countryName.textContent = data.sys.country;

    temperature.textContent = Math.round(data.main.temp);
    condition.textContent = data.weather[0].description;
    humidity.textContent = `${data.main.humidity}%`;
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    wind.textContent = `${data.wind.speed} m/s`;

    const iconCode = data.weather[0].icon;

    weatherIcon.src =
        `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    weatherIcon.alt = data.weather[0].description;

    updateDateTime();

    weatherCard.hidden = false;
    emptyState.hidden = true;
}

// Search form submission
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

// Keep the displayed date and time updated every minute
updateDateTime();
setInterval(updateDateTime, 60000);