
const CURRENT_WEATHER_URL = "/api/weather";
const FORECAST_URL = "/api/forecast";
const WEATHER_ICON_URL = "https://openweathermap.org/img/wn/";

const RECENT_STORAGE_KEY = "climateXRecentCities";
const FAVOURITES_STORAGE_KEY = "climateXFavouriteCities";
const MAX_RECENT_CITIES = 5;
const HOURLY_INTERVALS = 8;

const THEME_CLASSES = [
    "theme-sunny",
    "theme-cloudy",
    "theme-rainy",
    "theme-stormy",
    "theme-snowy",
    "theme-night"
];

const weatherForm = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const locationBtnText = document.getElementById("locationBtnText");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const weatherCard = document.getElementById("weatherCard");
const emptyState = document.getElementById("emptyState");
const refreshBtn = document.getElementById("refreshBtn");

const cityName = document.getElementById("cityName");
const countryName = document.getElementById("countryName");
const currentDateTime = document.getElementById("currentDateTime");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const temperatureUnit = document.getElementById("temperatureUnit");
const condition = document.getElementById("condition");
const humidity = document.getElementById("humidity");
const feelsLike = document.getElementById("feelsLike");
const wind = document.getElementById("wind");

const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");

const insightsSection = document.getElementById("insightsSection");
const insightsGrid = document.getElementById("insightsGrid");

const hourlySection = document.getElementById("hourlySection");
const hourlyLocation = document.getElementById("hourlyLocation");
const hourlyError = document.getElementById("hourlyError");
const hourlyGrid = document.getElementById("hourlyGrid");
const temperatureChart = document.getElementById("temperatureChart");
const chartUnitLabel = document.getElementById("chartUnitLabel");

const forecastSection = document.getElementById("forecastSection");
const forecastLoading = document.getElementById("forecastLoading");
const forecastError = document.getElementById("forecastError");
const forecastLocation = document.getElementById("forecastLocation");
const forecastGrid = document.getElementById("forecastGrid");
const forecastNote = document.getElementById("forecastNote");

const recentCitiesContainer = document.getElementById("recentCities");
const favouriteCitiesContainer = document.getElementById("favouriteCities");
const clearRecentBtn = document.getElementById("clearRecentBtn");
const favouriteBtn = document.getElementById("favouriteBtn");
const favouriteIcon = document.getElementById("favouriteIcon");
const favouriteBtnText = document.getElementById("favouriteBtnText");

let latestWeather = null;
let latestForecast = null;
let forecastDays = [];
let hourlyItems = [];
let temperatureScale = "C";
let searchRequestId = 0;

let lastSearchMode = null;
let lastSearchedCity = "";
let lastCoordinates = null;

let recentCities = readStoredCities(RECENT_STORAGE_KEY);
let favouriteCities = readStoredCities(FAVOURITES_STORAGE_KEY);

function readStoredCities(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key) || "[]");

        if (!Array.isArray(saved)) {
            return [];
        }

        return saved
            .filter(city => typeof city === "string" && city.trim())
            .map(city => city.trim())
            .filter((city, index, list) =>
                list.findIndex(item =>
                    item.toLowerCase() === city.toLowerCase()
                ) === index
            );
    } catch (error) {
        console.warn("Unable to read saved cities:", error);
        return [];
    }
}

function saveCities(key, cities) {
    try {
        localStorage.setItem(key, JSON.stringify(cities));
        return true;
    } catch (error) {
        console.warn("Unable to save cities:", error);
        return false;
    }
}

function showLoading() {
    loading.hidden = false;
    errorMessage.hidden = true;
    emptyState.hidden = true;
    searchBtn.disabled = true;
    refreshBtn.disabled = true;
}

function hideLoading() {
    loading.hidden = true;
    searchBtn.disabled = false;
    refreshBtn.disabled = false;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

function resetLocationButton() {
    locationBtn.disabled = false;
    locationBtnText.textContent = "Use My Location";
}

function formatTemperature(value) {
    const converted = temperatureScale === "F"
        ? (value * 9) / 5 + 32
        : value;

    return `${Math.round(converted)}°${temperatureScale}`;
}

function formatDate(dateString, options = {}) {
    const date = new Date(dateString);

    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        ...options
    });
}

function getCityLocalDateTime(unixSeconds, timezoneOffset = 0) {
    return new Date((unixSeconds + timezoneOffset) * 1000);
}

function getCityTimeLabel(item) {
    const date = getCityLocalDateTime(
        item.dt,
        latestWeather?.timezone || 0
    );

    return `${String(date.getUTCHours()).padStart(2, "0")}:00`;
}

function getCityDateLabel(item) {
    const date = getCityLocalDateTime(
        item.dt,
        latestWeather?.timezone || 0
    );

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC"
    });
}

function updateClock() {
    if (!latestWeather || weatherCard.hidden) {
        return;
    }

    const timezoneOffset = latestWeather.timezone || 0;
    const utcMilliseconds =
        Date.now() + new Date().getTimezoneOffset() * 60000;

    const localTime = new Date(
        utcMilliseconds + timezoneOffset * 1000
    );

    currentDateTime.textContent = localTime.toLocaleString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function fetchWeatherData(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.message || "Unable to retrieve weather data."
        );
    }

    return data;
}

function getWeatherIconUrl(iconCode) {
    return `${WEATHER_ICON_URL}${iconCode}@2x.png`;
}

/* Dynamic weather theme */

function applyWeatherTheme(data) {
    document.body.classList.remove(...THEME_CLASSES);

    const weather = data.weather?.[0];
    const weatherId = Number(weather?.id || 0);
    const iconCode = weather?.icon || "";
    const description = (weather?.main || "").toLowerCase();
    const isNight = iconCode.endsWith("n");

    let theme;

    if (isNight) {
        theme = "theme-night";
    } else if (weatherId >= 200 && weatherId < 300) {
        theme = "theme-stormy";
    } else if (
        (weatherId >= 300 && weatherId < 600) ||
        description === "rain" ||
        description === "drizzle"
    ) {
        theme = "theme-rainy";
    } else if (
        (weatherId >= 600 && weatherId < 700) ||
        description === "snow"
    ) {
        theme = "theme-snowy";
    } else if (weatherId === 800 || description === "clear") {
        theme = "theme-sunny";
    } else {
        theme = "theme-cloudy";
    }

    document.body.classList.add(theme);
    document.documentElement.dataset.weatherTheme = theme.replace("theme-", "");
}

function displayWeather(data) {
    latestWeather = data;
    applyWeatherTheme(data);

    cityName.textContent = data.name || "Selected location";
    countryName.textContent = data.sys?.country || "Location found";

    const iconCode = data.weather?.[0]?.icon;

    weatherIcon.src = iconCode ? getWeatherIconUrl(iconCode) : "";
    weatherIcon.alt = data.weather?.[0]?.description || "Current weather";

    temperature.textContent = Math.round(data.main.temp);
    temperatureUnit.textContent = `°${temperatureScale}`;

    condition.textContent =
        data.weather?.[0]?.description || "Unavailable";

    humidity.textContent = `${data.main.humidity}%`;
    feelsLike.textContent = formatTemperature(data.main.feels_like);
    wind.textContent =
        `${Number(data.wind?.speed ?? 0).toFixed(1)} m/s`;

    weatherCard.hidden = false;
    emptyState.hidden = true;

    updateClock();
    updateUnitButtons();
    updateFavouriteButton();
}

function updateUnitButtons() {
    const isCelsius = temperatureScale === "C";

    celsiusBtn.classList.toggle("active", isCelsius);
    fahrenheitBtn.classList.toggle("active", !isCelsius);

    celsiusBtn.setAttribute("aria-pressed", String(isCelsius));
    fahrenheitBtn.setAttribute("aria-pressed", String(!isCelsius));

    if (!latestWeather) {
        return;
    }

    temperature.textContent = Math.round(
        temperatureScale === "F"
            ? (latestWeather.main.temp * 9) / 5 + 32
            : latestWeather.main.temp
    );

    temperatureUnit.textContent = `°${temperatureScale}`;
    feelsLike.textContent = formatTemperature(latestWeather.main.feels_like);
    chartUnitLabel.textContent = `°${temperatureScale}`;

    renderHourlyForecast();
    renderForecast();
}

function prepareHourlyForecast(data) {
    const now = Math.floor(Date.now() / 1000);

    hourlyItems = (data.list || [])
        .filter(item => item.dt > now)
        .slice(0, HOURLY_INTERVALS);
}

function prepareForecast(data) {
    const groupedDays = new Map();

    for (const item of data.list || []) {
        const date = item.dt_txt.split(" ")[0];

        if (!groupedDays.has(date)) {
            groupedDays.set(date, []);
        }

        groupedDays.get(date).push(item);
    }

    const today = new Date().toLocaleDateString("en-CA");

    forecastDays = Array.from(groupedDays.entries())
        .filter(([date]) => date >= today)
        .slice(0, 5)
        .map(([date, entries]) => {
            const minTemp = Math.min(
                ...entries.map(item => item.main.temp_min)
            );

            const maxTemp = Math.max(
                ...entries.map(item => item.main.temp_max)
            );

            const representative = entries.reduce((closest, item) => {
                const itemHour = Number(item.dt_txt.slice(11, 13));
                const closestHour = Number(closest.dt_txt.slice(11, 13));

                return Math.abs(itemHour - 12) < Math.abs(closestHour - 12)
                    ? item
                    : closest;
            }, entries[0]);

            const rainChance = Math.round(
                Math.max(...entries.map(item => (item.pop || 0) * 100))
            );

            const averageHumidity = Math.round(
                entries.reduce(
                    (sum, item) => sum + item.main.humidity,
                    0
                ) / entries.length
            );

            return {
                date,
                minTemp,
                maxTemp,
                icon: representative.weather?.[0]?.icon,
                description:
                    representative.weather?.[0]?.description || "Unavailable",
                humidity: averageHumidity,
                rainChance
            };
        });
}

/* Hourly forecast cards */

function renderHourlyForecast() {
    hourlyGrid.replaceChildren();
    temperatureChart.replaceChildren();

    if (!hourlyItems.length || !latestWeather) {
        hourlyGrid.hidden = true;
        temperatureChart.hidden = true;
        return;
    }
    hourlySection.hidden = false;

    hourlyGrid.hidden = false;
    temperatureChart.hidden = false;
    chartUnitLabel.textContent = `°${temperatureScale}`;

    hourlyItems.forEach((item, index) => {
        const card = document.createElement("article");
        card.className = "hourly-card";

        const time = document.createElement("p");
        time.className = "hourly-time";
        time.textContent = index === 0 ? "Next" : getCityTimeLabel(item);

        const icon = document.createElement("img");
        icon.className = "hourly-icon";

        const iconCode = item.weather?.[0]?.icon;
        icon.src = iconCode ? getWeatherIconUrl(iconCode) : "";
        icon.alt = item.weather?.[0]?.description || "Forecast weather";
        icon.loading = "lazy";

        const temp = document.createElement("p");
        temp.className = "hourly-temperature";
        temp.textContent = formatTemperature(item.main.temp);

        const description = document.createElement("p");
        description.className = "hourly-condition";
        description.textContent =
            item.weather?.[0]?.description || "Unavailable";

        const rain = document.createElement("p");
        rain.className = "hourly-rain";
        rain.textContent = `☔ ${Math.round((item.pop || 0) * 100)}%`;

        card.append(time, icon, temp, description, rain);
        hourlyGrid.appendChild(card);
    });

    renderTemperatureChart();
}

/* SVG chart, drawn without an external library */

function renderTemperatureChart() {
    temperatureChart.replaceChildren();

    if (!hourlyItems.length) {
        return;
    }

    const width = 640;
    const height = 220;
    const padding = { top: 20, right: 24, bottom: 36, left: 34 };

    const values = hourlyItems.map(item =>
        temperatureScale === "F"
            ? (item.main.temp * 9) / 5 + 32
            : item.main.temp
    );

    const minValue = Math.floor(Math.min(...values) - 2);
    const maxValue = Math.ceil(Math.max(...values) + 2);
    const range = Math.max(1, maxValue - minValue);

    const x = index =>
        padding.left +
        (index / Math.max(1, values.length - 1)) *
        (width - padding.left - padding.right);

    const y = value =>
        padding.top +
        ((maxValue - value) / range) *
        (height - padding.top - padding.bottom);

    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Hourly temperature trend");

    const gridCount = 4;

    for (let i = 0; i <= gridCount; i++) {
        const value = minValue + (range / gridCount) * i;
        const lineY = y(value);

        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", padding.left);
        line.setAttribute("x2", width - padding.right);
        line.setAttribute("y1", lineY);
        line.setAttribute("y2", lineY);
        line.setAttribute("stroke", "currentColor");
        line.setAttribute("stroke-opacity", "0.15");
        svg.appendChild(line);

        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", padding.left - 8);
        label.setAttribute("y", lineY + 4);
        label.setAttribute("text-anchor", "end");
        label.setAttribute("font-size", "10");
        label.setAttribute("fill", "currentColor");
        label.textContent = `${Math.round(value)}°`;
        svg.appendChild(label);
    }

    const points = values.map((value, index) =>
        `${x(index)},${y(value)}`
    ).join(" ");

    const polyline = document.createElementNS(svgNS, "polyline");
    polyline.setAttribute("points", points);
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "currentColor");
    polyline.setAttribute("stroke-width", "3");
    polyline.setAttribute("stroke-linecap", "round");
    polyline.setAttribute("stroke-linejoin", "round");
    svg.appendChild(polyline);

    values.forEach((value, index) => {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", x(index));
        circle.setAttribute("cy", y(value));
        circle.setAttribute("r", "4");
        circle.setAttribute("fill", "currentColor");
        svg.appendChild(circle);

        const timeLabel = document.createElementNS(svgNS, "text");
        timeLabel.setAttribute("x", x(index));
        timeLabel.setAttribute("y", height - 12);
        timeLabel.setAttribute("text-anchor", "middle");
        timeLabel.setAttribute("font-size", "10");
        timeLabel.setAttribute("fill", "currentColor");
        timeLabel.textContent =
            index % 2 === 0 ? getCityTimeLabel(hourlyItems[index]) : "";
        svg.appendChild(timeLabel);
    });

    temperatureChart.appendChild(svg);
}

/* Five-day forecast */

function renderForecast() {
    forecastGrid.replaceChildren();

    if (!forecastDays.length) {
        forecastSection.hidden = true;
        return;
    }

    forecastSection.hidden = false;

    forecastDays.forEach((day, index) => {
        const card = document.createElement("article");
        card.className = "forecast-card";

        const date = document.createElement("p");
        date.className = "forecast-date";
        date.textContent = index === 0
            ? "Today"
            : formatDate(`${day.date}T12:00:00`);

        const icon = document.createElement("img");
        icon.className = "forecast-icon";
        icon.src = day.icon ? getWeatherIconUrl(day.icon) : "";
        icon.alt = day.description;
        icon.loading = "lazy";

        const description = document.createElement("p");
        description.className = "forecast-condition";
        description.textContent = day.description;

        const temperatures = document.createElement("p");
        temperatures.className = "forecast-temperatures";
        temperatures.textContent =
            `${formatTemperature(day.maxTemp)} / ` +
            `${formatTemperature(day.minTemp)}`;

        const rain = document.createElement("p");
        rain.className = "forecast-rain";
        rain.textContent = `Rain chance: ${day.rainChance}%`;

        const moisture = document.createElement("p");
        moisture.className = "forecast-humidity";
        moisture.textContent = `Humidity: ${day.humidity}%`;

        card.append(
            date,
            icon,
            description,
            temperatures,
            rain,
            moisture
        );

        forecastGrid.appendChild(card);
    });
}

/* Weather insights */

function renderWeatherInsights(data) {
    insightsGrid.replaceChildren();

    const temp = data.main?.temp;
    const feels = data.main?.feels_like;
    const humidityValue = data.main?.humidity;
    const windSpeed = data.wind?.speed;
    const visibility = data.visibility;
    const pressure = data.main?.pressure;

    const insights = [
        {
            title: "Feels like",
            value: Number.isFinite(feels)
                ? formatTemperature(feels)
                : "Unavailable",
            detail: "Perceived outdoor temperature"
        },
        {
            title: "Humidity",
            value: Number.isFinite(humidityValue)
                ? `${humidityValue}%`
                : "Unavailable",
            detail: "Moisture in the air"
        },
        {
            title: "Wind speed",
            value: Number.isFinite(windSpeed)
                ? `${windSpeed.toFixed(1)} m/s`
                : "Unavailable",
            detail: "Current wind conditions"
        },
        {
            title: "Visibility",
            value: Number.isFinite(visibility)
                ? `${(visibility / 1000).toFixed(1)} km`
                : "Unavailable",
            detail: "Distance visible outdoors"
        },
        {
            title: "Pressure",
            value: Number.isFinite(pressure)
                ? `${pressure} hPa`
                : "Unavailable",
            detail: "Atmospheric pressure"
        },
        {
            title: "Temperature",
            value: Number.isFinite(temp)
                ? formatTemperature(temp)
                : "Unavailable",
            detail: "Current air temperature"
        }
    ];

    insights.forEach(item => {
        const card = document.createElement("article");
        card.className = "insight-card";

        const title = document.createElement("h3");
        title.textContent = item.title;

        const value = document.createElement("p");
        value.className = "insight-value";
        value.textContent = item.value;

        const detail = document.createElement("p");
        detail.className = "insight-detail";
        detail.textContent = item.detail;

        card.append(title, value, detail);
        insightsGrid.appendChild(card);
    });

    insightsSection.hidden = false;
}

/* API error handling */

function getApiErrorMessage(error) {
    const message = String(error?.message || "");

    if (message.includes("404")) {
        return "City not found. Check the spelling and try again.";
    }

    if (message.includes("401")) {
        return "The weather service rejected its server API key. Check OPENWEATHER_API_KEY.";
    }

    if (message.includes("429")) {
        return "Too many weather requests. Please wait and try again.";
    }

    if (message.includes("503")) {
        return "The server weather API key is not configured yet.";
    }

    return message || "Unable to load weather data. Please try again.";
}

/* Recent searches */

function addRecentCity(city) {
    if (!city) return;

    recentCities = [
        city,
        ...recentCities.filter(
            item => item.toLowerCase() !== city.toLowerCase()
        )
    ].slice(0, MAX_RECENT_CITIES);

    saveCities(RECENT_STORAGE_KEY, recentCities);
    renderRecentCities();
}

function renderRecentCities() {
    recentCitiesContainer.replaceChildren();

    if (!recentCities.length) {
        recentCitiesContainer.hidden = true;
        return;
    }

    recentCitiesContainer.hidden = false;

    recentCities.forEach(city => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "city-chip";
        button.textContent = city;
        button.addEventListener("click", () => loadWeatherForQuery(city));
        recentCitiesContainer.appendChild(button);
    });
}

/* Favourite cities */

function toggleFavourite(city) {
    if (!city) return;

    const existingIndex = favouriteCities.findIndex(
        item => item.toLowerCase() === city.toLowerCase()
    );

    if (existingIndex >= 0) {
        favouriteCities.splice(existingIndex, 1);
    } else {
        favouriteCities.push(city);
    }

    saveCities(FAVOURITES_STORAGE_KEY, favouriteCities);
    renderFavouriteCities();
    updateFavouriteButton();
}

function isFavourite(city) {
    return favouriteCities.some(
        item => item.toLowerCase() === String(city).toLowerCase()
    );
}

function updateFavouriteButton() {
    const city = latestWeather?.name;

    if (!favouriteBtn) return;

    const favourite = city ? isFavourite(city) : false;

    favouriteBtn.disabled = !city;

    if (favouriteIcon) {
        favouriteIcon.textContent = favourite ? "★" : "☆";
    }

    if (favouriteBtnText) {
        favouriteBtnText.textContent = favourite
            ? "Remove Favourite"
            : "Add Favourite";
    }

    favouriteBtn.setAttribute("aria-pressed", String(favourite));
}

function renderFavouriteCities() {
    favouriteCitiesContainer.replaceChildren();

    if (!favouriteCities.length) {
        favouriteCitiesContainer.hidden = true;
        return;
    }

    favouriteCitiesContainer.hidden = false;

    favouriteCities.forEach(city => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "city-chip";
        button.textContent = `★ ${city}`;

        button.addEventListener("click", () => {
            loadWeatherForQuery(city);
        });

        favouriteCitiesContainer.appendChild(button);
    });
}

/* Main weather search */

async function loadWeatherForQuery(city, coordinates = null) {
    const requestNumber = ++searchRequestId;
    const cleanCity = String(city || "").trim();

    if (!coordinates && !cleanCity) {
        showError("Please enter a city name.");
        cityInput.focus();
        return;
    }

    clearError();
    showLoading();

    lastSearchMode = coordinates ? "coordinates" : "city";
    lastSearchedCity = cleanCity;
    lastCoordinates = coordinates;

    try {
        let query;

        if (coordinates) {
            query =
                `lat=${encodeURIComponent(coordinates.lat)}` +
                `&lon=${encodeURIComponent(coordinates.lon)}`;
        } else {
            query = `q=${encodeURIComponent(cleanCity)}`;
        }

        const weatherUrl = `${CURRENT_WEATHER_URL}?${query}`;
        const forecastUrl = `${FORECAST_URL}?${query}`;

        const weatherData = await fetchWeatherData(weatherUrl);

        if (requestNumber !== searchRequestId) return;

        latestWeather = weatherData;
        displayWeather(weatherData);
        renderWeatherInsights(weatherData);

        if (!coordinates) {
            addRecentCity(weatherData.name);
            cityInput.value = weatherData.name;
        }

        forecastLoading.hidden = false;
        forecastError.hidden = true;
        hourlyError.hidden = true;

        try {
            const forecastData = await fetchWeatherData(forecastUrl);

            if (requestNumber !== searchRequestId) return;

            latestForecast = forecastData;
            prepareHourlyForecast(forecastData);
            prepareForecast(forecastData);

            forecastLocation.textContent = weatherData.name;
            hourlyLocation.textContent = weatherData.name;

            renderHourlyForecast();
            renderForecast();
        } catch (forecastException) {
            if (requestNumber !== searchRequestId) return;

            forecastError.textContent = getApiErrorMessage(forecastException);
            forecastError.hidden = false;

            hourlyError.textContent =
                getApiErrorMessage(forecastException);
            hourlyError.hidden = false;

            forecastSection.hidden = false;
        } finally {
            if (requestNumber === searchRequestId) {
                forecastLoading.hidden = true;
            }
        }
    } catch (error) {
        if (requestNumber !== searchRequestId) return;

        showError(getApiErrorMessage(error));
    } finally {
        if (requestNumber === searchRequestId) {
            hideLoading();
            resetLocationButton();
        }
    }
}

/* Current-location search */

function loadMyLocation() {
    if (!navigator.geolocation) {
        showError("Location services are not supported by this browser.");
        return;
    }

    locationBtn.disabled = true;
    locationBtnText.textContent = "Finding location...";

    navigator.geolocation.getCurrentPosition(
        position => {
            loadWeatherForQuery("", {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            });
        },
        error => {
            resetLocationButton();

            if (error.code === error.PERMISSION_DENIED) {
                showError("Location permission was denied. Allow access and try again.");
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                showError("Your location is currently unavailable.");
            } else if (error.code === error.TIMEOUT) {
                showError("Location request timed out. Please try again.");
            } else {
                showError("Unable to retrieve your location.");
            }
        },
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

/* Refresh the current search */

function refreshWeather() {
    if (lastSearchMode === "coordinates" && lastCoordinates) {
        loadWeatherForQuery("", lastCoordinates);
    } else if (lastSearchedCity) {
        loadWeatherForQuery(lastSearchedCity);
    } else {
        showError("Search for a city before refreshing.");
    }
}

/* Event listeners */

if (weatherForm) {
    weatherForm.addEventListener("submit", event => {
        event.preventDefault();

        const city = cityInput.value.trim();

        if (!city) {
            showError("Please enter a city name.");
            cityInput.focus();
            return;
        }

        loadWeatherForQuery(city);
    });
}

if (locationBtn) {
    locationBtn.addEventListener("click", loadMyLocation);
}

if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshWeather);
}

if (celsiusBtn) {
    celsiusBtn.addEventListener("click", () => {
        temperatureScale = "C";
        updateUnitButtons();
    });
}

if (fahrenheitBtn) {
    fahrenheitBtn.addEventListener("click", () => {
        temperatureScale = "F";
        updateUnitButtons();
    });
}

if (favouriteBtn) {
    favouriteBtn.addEventListener("click", () => {
        if (latestWeather?.name) {
            toggleFavourite(latestWeather.name);
        }
    });
}

if (clearRecentBtn) {
    clearRecentBtn.addEventListener("click", () => {
        recentCities = [];
        saveCities(RECENT_STORAGE_KEY, recentCities);
        renderRecentCities();
    });
}

/* Initialize dashboard */

function initializeClimateX() {
    renderRecentCities();
    renderFavouriteCities();
    updateFavouriteButton();

    if (weatherCard) {
        weatherCard.hidden = true;
    }

    if (emptyState) {
        emptyState.hidden = false;
    }

    if (forecastSection) {
        forecastSection.hidden = true;
    }

    if (hourlySection) {
        hourlySection.hidden = true;
    }

    if (insightsSection) {
        insightsSection.hidden = true;
    }

    if (forecastLoading) {
        forecastLoading.hidden = true;
    }

    if (hourlyError) {
        hourlyError.hidden = true;
    }

    if (forecastError) {
        forecastError.hidden = true;
    }
}

initializeClimateX();

/* Keep the displayed city clock current. */
setInterval(updateClock, 30000);
