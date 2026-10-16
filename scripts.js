// ========================================
// ClimateX — Weather Intelligence
// Reliability improvements + weather insights
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

// Temperature toggle elements
const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");

// Forecast elements
const forecastSection = document.getElementById("forecastSection");
const forecastGrid = document.getElementById("forecastGrid");
const forecastLocation = document.getElementById("forecastLocation");
const forecastLoading = document.getElementById("forecastLoading");
const forecastError = document.getElementById("forecastError");
const forecastNote = document.getElementById("forecastNote");

// Insights elements
const insightsSection = document.getElementById("insightsSection");
const insightsGrid = document.getElementById("insightsGrid");

// Application state
let lastSearchedCity = "";
let currentTempCelsius = null;
let feelsLikeCelsius = null;
let currentUnit = "C";
let forecastDays = [];
let latestWeather = null;
let latestForecast = null;
let searchRequestId = 0;

// ----------------------------------------
// Errors and loading
// ----------------------------------------

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

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

function showForecastError(message) {
    forecastError.textContent = message;
    forecastError.hidden = false;
}

function clearForecastError() {
    forecastError.textContent = "";
    forecastError.hidden = true;
}

// ----------------------------------------
// Validation and date/time
// ----------------------------------------

function isValidCity(city) {
    return /^[a-zA-ZÀ-ÿ\s.'-]+$/.test(city);
}

function updateDateTime() {
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

// ----------------------------------------
// Temperature conversion
// ----------------------------------------

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
        updateToggleButtons();
        return;
    }

    temperature.textContent = Math.round(
        currentUnit === "C"
            ? currentTempCelsius
            : toFahrenheit(currentTempCelsius)
    );

    const unit = currentUnit === "C" ? "°C" : "°F";
    temperatureUnit.textContent = unit;

    const feelsLikeValue = currentUnit === "C"
        ? feelsLikeCelsius
        : toFahrenheit(feelsLikeCelsius);

    feelsLike.textContent = `${Math.round(feelsLikeValue)}${unit}`;

    updateToggleButtons();
    renderForecast();
    renderInsights();
}

// ----------------------------------------
// API helper
// ----------------------------------------

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
                "OpenWeatherMap rejected the API key. Check that it is active and authorized for this endpoint."
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

// ----------------------------------------
// Search current weather and forecast
// ----------------------------------------

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

    const requestId = ++searchRequestId;

    showLoading();
    clearForecastError();
    forecastLoading.hidden = true;
    forecastGrid.replaceChildren();
    forecastSection.hidden = true;
    insightsSection.hidden = true;
    emptyState.hidden = true;

    // Current weather and forecast are requested independently.
    // A forecast failure will not hide successfully loaded current weather.
    const query =
        `q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

    const currentPromise = fetchJSON(`${API_URL}?${query}`);
    const forecastPromise = fetchJSON(`${FORECAST_URL}?${query}`);

    forecastLoading.hidden = false;

    const [currentResult, forecastResult] = await Promise.allSettled([
        currentPromise,
        forecastPromise
    ]);

    // Ignore older searches if the user submitted another city meanwhile.
    if (requestId !== searchRequestId) {
        return;
    }

    try {
        if (currentResult.status === "rejected") {
            throw currentResult.reason;
        }

        latestWeather = currentResult.value;
        displayWeather(latestWeather);
        lastSearchedCity = city;

        if (forecastResult.status === "fulfilled") {
            latestForecast = forecastResult.value;
            prepareForecast(latestForecast);
        } else {
            latestForecast = null;
            forecastDays = [];
            renderForecast();

            forecastSection.hidden = false;
            showForecastError(
                `Current weather loaded, but the forecast is unavailable: ${forecastResult.reason.message}`
            );
        }

        // Insights remain available when current weather succeeds.
        renderInsights();

    } catch (error) {
        console.error("ClimateX weather request failed:", error);

        showError(error.message || "Something went wrong. Please try again.");

        weatherCard.hidden = true;
        forecastSection.hidden = true;
        insightsSection.hidden = true;
        emptyState.hidden = false;

    } finally {
        if (requestId === searchRequestId) {
            hideLoading();
            forecastLoading.hidden = true;
        }
    }
}

// ----------------------------------------
// Display current weather
// ----------------------------------------

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

    weatherCard.hidden = false;
    emptyState.hidden = true;

    renderTemperatures();
}

// ----------------------------------------
// Prepare daily forecast
// ----------------------------------------

function getLocalForecastDate(timestamp, timezoneOffset) {
    return new Date(
        (timestamp + timezoneOffset) * 1000
    ).toISOString().slice(0, 10);
}

function getLocalForecastHour(timestamp, timezoneOffset) {
    return new Date(
        (timestamp + timezoneOffset) * 1000
    ).getUTCHours();
}

function prepareForecast(data) {
    const timezoneOffset = data.city.timezone;
    const groupedDays = new Map();

    for (const item of data.list) {
        const dateKey = getLocalForecastDate(item.dt, timezoneOffset);
        const localHour = getLocalForecastHour(item.dt, timezoneOffset);

        if (!groupedDays.has(dateKey)) {
            groupedDays.set(dateKey, []);
        }

        groupedDays.get(dateKey).push({ item, localHour });
    }

    const todayKey = getLocalForecastDate(
        Math.floor(Date.now() / 1000),
        timezoneOffset
    );

    forecastDays = [];

    for (const [dateKey, entries] of groupedDays.entries()) {
        // Include today if forecast intervals remain; then show upcoming days.
        if (dateKey < todayKey) continue;

        const temperatures = entries.map(entry => entry.item.main.temp);
        const high = Math.max(...temperatures);
        const low = Math.min(...temperatures);

        const daytimeEntries = entries.filter(
            entry => entry.localHour >= 11 && entry.localHour <= 15
        );

        const candidates = daytimeEntries.length
            ? daytimeEntries
            : entries;

        const representative = candidates.reduce((best, current) => {
            return Math.abs(current.localHour - 12) <
                Math.abs(best.localHour - 12)
                ? current
                : best;
        });

        const averageHumidity = Math.round(
            entries.reduce(
                (sum, entry) => sum + entry.item.main.humidity,
                0
            ) / entries.length
        );

        const maxRainProbability = Math.max(
            ...entries.map(entry => entry.item.pop || 0)
        );

        forecastDays.push({
            date: dateKey,
            high,
            low,
            humidity: averageHumidity,
            rainProbability: maxRainProbability,
            condition: representative.item.weather[0].description,
            main: representative.item.weather[0].main,
            icon: representative.item.weather[0].icon
        });

        if (forecastDays.length === 5) break;
    }

    forecastLocation.textContent =
        `${data.city.name}, ${data.city.country}`;

    clearForecastError();
    renderForecast();

    forecastSection.hidden = forecastDays.length === 0;

    if (forecastDays.length === 0) {
        showForecastError("No daily forecast intervals were returned.");
    }
}

// ----------------------------------------
// Render forecast cards
// ----------------------------------------

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
        heading.textContent = index === 0 &&
            day.date === getLocalForecastDate(
                Math.floor(Date.now() / 1000),
                latestForecast?.city?.timezone || 0
            )
            ? "Today"
            : dayName;

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

        const rainElement = document.createElement("p");
        rainElement.className = "forecast-date";
        rainElement.textContent =
            `Rain chance: ${Math.round(day.rainProbability * 100)}%`;

        card.append(
            heading,
            dateElement,
            icon,
            description,
            temperatures,
            humidityElement,
            rainElement
        );

        forecastGrid.appendChild(card);
    });
}

// ----------------------------------------
// Weather insights
// ----------------------------------------

function buildInsights(data, forecastData) {
    const temp = data.main.temp;
    const humidityValue = data.main.humidity;
    const windSpeed = data.wind.speed;
    const weatherMain = data.weather[0].main.toLowerCase();
    const weatherDescription = data.weather[0].description.toLowerCase();

    const insights = [];

    const forecastHasRain = forecastDays.some(day =>
        ["rain", "drizzle", "thunderstorm"].includes(day.main.toLowerCase()) ||
        day.rainProbability >= 0.45
    );

    const currentHasRain =
        ["rain", "drizzle", "thunderstorm"].includes(weatherMain) ||
        weatherDescription.includes("rain") ||
        weatherDescription.includes("thunder");

    if (currentHasRain || forecastHasRain) {
        insights.push({
            icon: "☔",
            title: "Rain preparedness",
            description: currentHasRain
                ? "Rain-related conditions are reported now. Consider carrying an umbrella and allowing extra travel time."
                : "Rain is possible in the forecast. Check conditions before heading outdoors and consider carrying an umbrella."
        });
    }

    if (temp >= 32) {
        insights.push({
            icon: "☀️",
            title: "High temperature",
            description: "It is hot outside. Drink water regularly, seek shade when possible, and limit strenuous outdoor activity during the hottest hours."
        });
    } else if (temp <= 10) {
        insights.push({
            icon: "🧥",
            title: "Cool conditions",
            description: "Consider wearing an extra layer outdoors, particularly during the morning and evening."
        });
    } else {
        insights.push({
            icon: "🌤️",
            title: "Outdoor planning",
            description: `Current conditions are ${data.weather[0].description}. Check the forecast before planning longer outdoor activities.`
        });
    }

    if (humidityValue >= 75) {
        insights.push({
            icon: "💧",
            title: "High humidity",
            description: "The air is humid, which can make warm conditions feel more uncomfortable. Take breaks and drink water during physical activity."
        });
    } else if (humidityValue <= 30) {
        insights.push({
            icon: "🌬️",
            title: "Low humidity",
            description: "Humidity is low. Drink water regularly if you spend time outdoors, especially in warm or windy conditions."
        });
    }

    if (windSpeed >= 8) {
        insights.push({
            icon: "💨",
            title: "Strong winds",
            description: "Winds are relatively strong. Take care around exposed areas and secure lightweight outdoor objects."
        });
    }

    if (
        !currentHasRain &&
        forecastDays.length > 0 &&
        !forecastHasRain &&
        temp >= 10 &&
        temp < 32 &&
        humidityValue > 30 &&
        humidityValue < 75 &&
        windSpeed < 8
    ) {
        insights.push({
            icon: "🗓️",
            title: "Plan ahead",
            description: "No strong rain signal appears in the available forecast. Conditions can change, so check again before travelling."
        });
    }

    return insights.slice(0, 4);
}

function renderInsights() {
    insightsGrid.replaceChildren();

    if (!latestWeather) {
        insightsSection.hidden = true;
        return;
    }

    const insights = buildInsights(latestWeather, latestForecast);

    insights.forEach(insight => {
        const card = document.createElement("article");
        card.className = "insight-card";

        const icon = document.createElement("div");
        icon.className = "insight-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = insight.icon;

        const content = document.createElement("div");

        const title = document.createElement("h3");
        title.className = "insight-title";
        title.textContent = insight.title;

        const description = document.createElement("p");
        description.className = "insight-description";
        description.textContent = insight.description;

        content.append(title, description);
        card.append(icon, content);
        insightsGrid.appendChild(card);
    });

    insightsSection.hidden = false;
}

// ----------------------------------------
// Event listeners
// ----------------------------------------

weatherForm.addEventListener("submit", event => {
    event.preventDefault();
    handleSearch();
});

refreshBtn.addEventListener("click", () => {
    handleSearch(lastSearchedCity || cityInput.value);
});

celsiusBtn.addEventListener("click", () => {
    currentUnit = "C";
    renderTemperatures();
});

fahrenheitBtn.addEventListener("click", () => {
    currentUnit = "F";
    renderTemperatures();
});

// Initialize
updateDateTime();
updateToggleButtons();
setInterval(updateDateTime, 60000);