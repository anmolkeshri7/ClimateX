const CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
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

function hasApiKey() {
    return typeof API_KEY !== "undefined"
        && typeof API_KEY === "string"
        && API_KEY.trim() !== ""
        && API_KEY !== "YOUR_ACTUAL_KEY";
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

/* Prepare hourly and daily forecast data */

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

function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        tag
    );

    Object.entries(attributes).forEach(([name, value]) => {
        element.setAttribute(name, String(value));
    });

    return element;
}

function renderTemperatureChart() {
    temperatureChart.replaceChildren();

    if (!hourlyItems.length) {
        return;
    }

    const width = 760;
    const height = 250;
    const left = 42;
    const right = 18;
    const top = 25;
    const bottom = 42;

    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const values = hourlyItems.map(item =>
        temperatureScale === "F"
            ? (item.main.temp * 9) / 5 + 32
            : item.main.temp
    );

    let minValue = Math.floor(Math.min(...values) - 2);
    let maxValue = Math.ceil(Math.max(...values) + 2);

    if (maxValue === minValue) {
        maxValue = minValue + 1;
    }

    const xFor = index => left
        + (hourlyItems.length === 1
            ? plotWidth / 2
            : (index / (hourlyItems.length - 1)) * plotWidth);

    const yFor = value => top
        + ((maxValue - value) / (maxValue - minValue)) * plotHeight;

    const svg = createSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": `Temperature trend over ${hourlyItems.length} upcoming forecast intervals`
    });

    const title = createSvgElement("title");
    title.textContent = `Hourly temperatures in degrees ${temperatureScale === "C" ? "Celsius" : "Fahrenheit"}`;
    svg.appendChild(title);

    const defs = createSvgElement("defs");
    const gradient = createSvgElement("linearGradient", {
        id: "temperatureLineGradient",
        x1: "0",
        y1: "0",
        x2: "1",
        y2: "0"
    });

    gradient.appendChild(createSvgElement("stop", {
        offset: "0%",
        "stop-color": "var(--accent)"
    }));

    gradient.appendChild(createSvgElement("stop", {
        offset: "100%",
        "stop-color": "var(--accent-strong)"
    }));

    defs.appendChild(gradient);
    svg.appendChild(defs);

    const gridLines = 4;

    for (let index = 0; index <= gridLines; index++) {
        const y = top + (plotHeight / gridLines) * index;
        const value = maxValue - ((maxValue - minValue) / gridLines) * index;

        svg.appendChild(createSvgElement("line", {
            x1: left,
            y1: y,
            x2: width - right,
            y2: y,
            stroke: "var(--border)",
            "stroke-width": 1,
            "stroke-dasharray": "4 6"
        }));

        const label = createSvgElement("text", {
            x: left - 9,
            y: y + 4,
            fill: "var(--muted)",
            "font-size": 11,
            "text-anchor": "end"
        });

        label.textContent = `${Math.round(value)}°`;
        svg.appendChild(label);
    }

    const points = values.map((value, index) =>
        `${xFor(index)},${yFor(value)}`
    ).join(" ");

    const areaPoints = [
        `${xFor(0)},${top + plotHeight}`,
        ...values.map((value, index) => `${xFor(index)},${yFor(value)}`),
        `${xFor(values.length - 1)},${top + plotHeight}`
    ].join(" ");

    svg.appendChild(createSvgElement("polygon", {
        points: areaPoints,
        fill: "var(--accent)",
        opacity: 0.08
    }));

    svg.appendChild(createSvgElement("polyline", {
        points,
        fill: "none",
        stroke: "url(#temperatureLineGradient)",
        "stroke-width": 3.5,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
    }));

    values.forEach((value, index) => {
        const x = xFor(index);
        const y = yFor(value);

        const point = createSvgElement("circle", {
            cx: x,
            cy: y,
            r: 4.5,
            fill: "var(--accent)",
            stroke: "var(--background)",
            "stroke-width": 2
        });

        const tooltip = createSvgElement("title");
        tooltip.textContent =
            `${getCityTimeLabel(hourlyItems[index])}: ${Math.round(value)}°${temperatureScale}`;
        point.appendChild(tooltip);
        svg.appendChild(point);

        const showLabel = index === 0
            || index === values.length - 1
            || index % 2 === 0;

        if (showLabel) {
            const timeLabel = createSvgElement("text", {
                x,
                y: height - 13,
                fill: "var(--muted)",
                "font-size": 11,
                "text-anchor": "middle"
            });

            timeLabel.textContent = getCityTimeLabel(hourlyItems[index]);
            svg.appendChild(timeLabel);
        }
    });

    temperatureChart.appendChild(svg);
}

/* Five-day forecast */

function renderForecast() {
    forecastGrid.replaceChildren();

    if (!forecastDays.length) {
        forecastGrid.hidden = true;
        forecastNote.hidden = true;
        return;
    }

    forecastGrid.hidden = false;
    forecastNote.hidden = false;

    const today = new Date().toLocaleDateString("en-CA");

    forecastDays.forEach(day => {
        const card = document.createElement("article");
        card.className = "forecast-card";

        const dayLabel = document.createElement("p");
        dayLabel.className = "forecast-day";
        dayLabel.textContent = day.date === today
            ? "Today"
            : formatDate(`${day.date}T12:00:00`, { weekday: "short" });

        const dateLabel = document.createElement("p");
        dateLabel.className = "forecast-date";
        dateLabel.textContent = formatDate(`${day.date}T12:00:00`);

        const icon = document.createElement("img");
        icon.className = "forecast-icon";
        icon.src = day.icon ? getWeatherIconUrl(day.icon) : "";
        icon.alt = day.description;
        icon.loading = "lazy";

        const description = document.createElement("p");
        description.className = "forecast-condition";
        description.textContent = day.description;

        const temperatures = document.createElement("div");
        temperatures.className = "forecast-temperatures";

        const high = document.createElement("span");
        high.textContent = formatTemperature(day.maxTemp);

        const low = document.createElement("span");
        low.className = "forecast-low";
        low.textContent = formatTemperature(day.minTemp);

        temperatures.append(high, low);

        const humidityLabel = document.createElement("p");
        humidityLabel.className = "forecast-humidity";
        humidityLabel.textContent = `Humidity ${day.humidity}%`;

        const rainLabel = document.createElement("p");
        rainLabel.className = "forecast-humidity";
        rainLabel.textContent = `Rain chance ${day.rainChance}%`;

        card.append(
            dayLabel,
            dateLabel,
            icon,
            description,
            temperatures,
            humidityLabel,
            rainLabel
        );

        forecastGrid.appendChild(card);
    });
}

/* Weather insights */

function createInsight(icon, title, description) {
    const card = document.createElement("article");
    card.className = "insight-card";

    const iconElement = document.createElement("div");
    iconElement.className = "insight-icon";
    iconElement.setAttribute("aria-hidden", "true");
    iconElement.textContent = icon;

    const titleElement = document.createElement("h3");
    titleElement.textContent = title;

    const descriptionElement = document.createElement("p");
    descriptionElement.textContent = description;

    card.append(iconElement, titleElement, descriptionElement);
    return card;
}

function renderInsights() {
    insightsGrid.replaceChildren();

    if (!latestWeather) {
        insightsSection.hidden = true;
        return;
    }

    const temp = latestWeather.main.temp;
    const humidityValue = latestWeather.main.humidity;
    const windSpeed = latestWeather.wind?.speed ?? 0;
    const description =
        latestWeather.weather?.[0]?.description || "unavailable";

    let temperatureAdvice;

    if (temp >= 35) {
        temperatureAdvice =
            "It is very hot. Drink water and limit prolonged outdoor activity.";
    } else if (temp >= 28) {
        temperatureAdvice =
            "It is warm. Light clothing and water can help you stay comfortable.";
    } else if (temp <= 10) {
        temperatureAdvice =
            "It is cold. Consider a warm layer before heading out.";
    } else {
        temperatureAdvice =
            "Conditions look moderate. Dress comfortably for the weather.";
    }

    insightsGrid.appendChild(
        createInsight("🌡️", "Temperature", temperatureAdvice)
    );

    let humidityAdvice;

    if (humidityValue >= 75) {
        humidityAdvice = "Humidity is high, so it may feel muggy outside.";
    } else if (humidityValue <= 30) {
        humidityAdvice =
            "The air is relatively dry. Remember to drink water regularly.";
    } else {
        humidityAdvice = "Humidity is in a moderate range.";
    }

    insightsGrid.appendChild(
        createInsight("💧", "Humidity", humidityAdvice)
    );

    let windAdvice;

    if (windSpeed >= 10) {
        windAdvice =
            "Winds are strong. Take extra care with outdoor activities.";
    } else if (windSpeed >= 5) {
        windAdvice = "There is a noticeable breeze outdoors.";
    } else {
        windAdvice = "Wind speeds are relatively light.";
    }

    insightsGrid.appendChild(
        createInsight("🌬️", "Wind", windAdvice)
    );

    let forecastAdvice;

    if (latestForecast && forecastDays.length) {
        const rainExpected = forecastDays.some(
            day => day.rainChance >= 40
        );

        forecastAdvice = rainExpected
            ? "Rain is possible during the forecast period. Check conditions before heading out."
            : `Current conditions are ${description}. The available forecast shows no high rain probability.`;
    } else {
        forecastAdvice =
            `Current conditions are ${description}. The forecast is unavailable right now.`;
    }

    insightsGrid.appendChild(
        createInsight("☁️", "Plan ahead", forecastAdvice)
    );

    insightsSection.hidden = false;
}

/* Recent searches */

function addRecentCity(city) {
    if (!city || !city.trim()) {
        return;
    }

    recentCities = [
        city.trim(),
        ...recentCities.filter(
            item => item.toLowerCase() !== city.trim().toLowerCase()
        )
    ].slice(0, MAX_RECENT_CITIES);

    saveCities(RECENT_STORAGE_KEY, recentCities);
    renderSavedCities();
}

function removeRecentCity(city) {
    recentCities = recentCities.filter(
        item => item.toLowerCase() !== city.toLowerCase()
    );

    saveCities(RECENT_STORAGE_KEY, recentCities);
    renderSavedCities();
}

function clearRecentCities() {
    recentCities = [];
    saveCities(RECENT_STORAGE_KEY, recentCities);
    renderSavedCities();
}

/* Favourite cities */

function isFavourite(city) {
    return favouriteCities.some(
        item => item.toLowerCase() === city.toLowerCase()
    );
}

function toggleFavourite(city) {
    if (!city || !city.trim()) {
        return;
    }

    const cleanedCity = city.trim();

    if (isFavourite(cleanedCity)) {
        favouriteCities = favouriteCities.filter(
            item => item.toLowerCase() !== cleanedCity.toLowerCase()
        );
    } else {
        favouriteCities = [cleanedCity, ...favouriteCities];
    }

    saveCities(FAVOURITES_STORAGE_KEY, favouriteCities);
    renderSavedCities();
    updateFavouriteButton();
}

function removeFavouriteCity(city) {
    favouriteCities = favouriteCities.filter(
        item => item.toLowerCase() !== city.toLowerCase()
    );

    saveCities(FAVOURITES_STORAGE_KEY, favouriteCities);
    renderSavedCities();
    updateFavouriteButton();
}

function updateFavouriteButton() {
    if (!latestWeather) {
        favouriteBtn.disabled = true;
        favouriteBtn.classList.remove("is-favourite");
        favouriteBtn.setAttribute("aria-pressed", "false");
        favouriteIcon.textContent = "☆";
        favouriteBtnText.textContent = "Add favourite";
        return;
    }

    const currentCity = latestWeather.name || "";
    favouriteBtn.disabled = !currentCity;

    const saved = currentCity && isFavourite(currentCity);

    favouriteBtn.classList.toggle("is-favourite", Boolean(saved));
    favouriteBtn.setAttribute("aria-pressed", String(Boolean(saved)));
    favouriteIcon.textContent = saved ? "★" : "☆";
    favouriteBtnText.textContent = saved ? "Favourited" : "Add favourite";
    favouriteBtn.title = saved
        ? "Remove this city from favourites"
        : "Add this city to favourites";
}

function createCityChip(city, isFavouriteChip = false) {
    const chip = document.createElement("div");
    chip.className = "city-chip";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "chip-open";
    openButton.textContent = city;
    openButton.title = `Show weather for ${city}`;
    openButton.setAttribute("aria-label", `Show weather for ${city}`);
    openButton.style.cssText =
        "padding:0;border:0;color:inherit;background:transparent;cursor:pointer;";

    openButton.addEventListener("click", () => {
        cityInput.value = city;
        handleSearch(city);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "chip-remove";
    removeButton.textContent = "×";
    removeButton.setAttribute(
        "aria-label",
        `Remove ${city} from ${isFavouriteChip ? "favourites" : "recent searches"}`
    );
    removeButton.title = "Remove city";

    removeButton.addEventListener("click", () => {
        if (isFavouriteChip) {
            removeFavouriteCity(city);
        } else {
            removeRecentCity(city);
        }
    });

    chip.append(openButton, removeButton);
    return chip;
}

function renderCityList(container, cities, emptyMessage, isFavouriteChip = false) {
    container.replaceChildren();

    if (!cities.length) {
        const empty = document.createElement("p");
        empty.className = "saved-empty";
        empty.textContent = emptyMessage;
        container.appendChild(empty);
        return;
    }

    cities.forEach(city => {
        container.appendChild(createCityChip(city, isFavouriteChip));
    });
}

function renderSavedCities() {
    renderCityList(
        recentCitiesContainer,
        recentCities,
        "Your recent cities will appear here."
    );

    renderCityList(
        favouriteCitiesContainer,
        favouriteCities,
        "Star a city to save it here.",
        true
    );

    clearRecentBtn.disabled = recentCities.length === 0;
    clearRecentBtn.title = recentCities.length
        ? "Clear all recent searches"
        : "No recent searches to clear";
}

/* API loading and error handling */

function getApiErrorMessage(error) {
    const message = String(error?.message || "").toLowerCase();

    if (message.includes("city not found") || message.includes("not found")) {
        return "We couldn't find that location. Check the spelling and try again.";
    }

    if (message.includes("401") || message.includes("invalid api key")) {
        return "The API key was rejected. Check your OpenWeatherMap API key in config.js.";
    }

    if (message.includes("429")) {
        return "The weather service has received too many requests. Please try again later.";
    }

    if (message.includes("failed to fetch") || message.includes("network")) {
        return "Unable to connect to the weather service. Check your internet connection.";
    }

    return "We couldn't load weather for that location. Please try again.";
}

async function loadWeatherForQuery(
    query,
    requestId,
    mode,
    city = "",
    coordinates = null
) {
    showLoading();
    clearError();

    weatherCard.hidden = true;
    insightsSection.hidden = true;
    hourlySection.hidden = true;
    forecastSection.hidden = true;

    hourlyGrid.replaceChildren();
    temperatureChart.replaceChildren();
    forecastGrid.replaceChildren();

    hourlyError.hidden = true;
    forecastError.hidden = true;
    forecastLoading.hidden = true;
    forecastNote.hidden = true;

    try {
        const currentUrl =
            `${CURRENT_WEATHER_URL}?${query}&appid=${API_KEY}&units=metric`;

        const forecastUrl =
            `${FORECAST_URL}?${query}&appid=${API_KEY}&units=metric`;

        const [currentResult, forecastResult] = await Promise.allSettled([
            fetchWeatherData(currentUrl),
            fetchWeatherData(forecastUrl)
        ]);

        if (requestId !== searchRequestId) {
            return;
        }

        if (currentResult.status === "rejected") {
            throw currentResult.reason;
        }

        const currentData = currentResult.value;

        lastSearchMode = mode;
        lastSearchedCity = city;
        lastCoordinates = coordinates;

        displayWeather(currentData);

        if (mode === "location") {
            cityInput.value = currentData.name || "";
        }

        addRecentCity(currentData.name || city);

        if (forecastResult.status === "fulfilled") {
            latestForecast = forecastResult.value;

            prepareHourlyForecast(latestForecast);
            prepareForecast(latestForecast);

            hourlySection.hidden = false;
            hourlyLocation.textContent =
                `${currentData.name || "Selected location"} · Local time`;

            hourlyError.hidden = true;
            renderHourlyForecast();

            forecastSection.hidden = false;
            forecastLocation.textContent =
                `${currentData.name || "Selected location"} forecast`;

            renderForecast();
            forecastError.hidden = true;
        } else {
            latestForecast = null;
            hourlyItems = [];
            forecastDays = [];

            hourlySection.hidden = false;
            hourlyLocation.textContent =
                `${currentData.name || "Selected location"}`;

            hourlyError.textContent =
                "Hourly forecast and temperature trend are temporarily unavailable.";
            hourlyError.hidden = false;
            hourlyGrid.hidden = true;
            temperatureChart.hidden = true;

            forecastSection.hidden = false;
            forecastError.textContent =
                "Current weather loaded, but the five-day forecast is temporarily unavailable.";
            forecastError.hidden = false;
            forecastGrid.hidden = true;
            forecastNote.hidden = true;
        }

        renderInsights();
    } catch (error) {
        if (requestId !== searchRequestId) {
            return;
        }

        latestWeather = null;
        latestForecast = null;
        hourlyItems = [];
        forecastDays = [];

        weatherCard.hidden = true;
        insightsSection.hidden = true;
        hourlySection.hidden = true;
        forecastSection.hidden = true;
        emptyState.hidden = false;

        showError(getApiErrorMessage(error));
    } finally {
        if (requestId === searchRequestId) {
            hideLoading();
            resetLocationButton();
        }
    }
}

async function handleSearch(cityOverride = "") {
    const city = cityOverride.trim() || cityInput.value.trim();

    if (!city) {
        showError("Please enter a city name first.");
        cityInput.focus();
        return;
    }

    if (!hasApiKey()) {
        showError("Your API key is missing. Add your working OpenWeatherMap key to config.js.");
        return;
    }

    const requestId = ++searchRequestId;
    resetLocationButton();

    await loadWeatherForQuery(
        `q=${encodeURIComponent(city)}`,
        requestId,
        "city",
        city,
        null
    );
}

function handleLocationSearch() {
    if (!hasApiKey()) {
        showError("Your API key is missing. Add your working OpenWeatherMap key to config.js.");
        return;
    }

    if (!navigator.geolocation) {
        showError("Your browser does not support location access. Please search for a city instead.");
        return;
    }

    const requestId = ++searchRequestId;

    clearError();
    showLoading();

    weatherCard.hidden = true;
    insightsSection.hidden = true;
    hourlySection.hidden = true;
    forecastSection.hidden = true;
    emptyState.hidden = true;

    locationBtn.disabled = true;
    locationBtnText.textContent = "Finding location...";

    navigator.geolocation.getCurrentPosition(
        async position => {
            if (requestId !== searchRequestId) {
                return;
            }

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            await loadWeatherForQuery(
                `lat=${latitude}&lon=${longitude}`,
                requestId,
                "location",
                "",
                { latitude, longitude }
            );
        },
        error => {
            if (requestId !== searchRequestId) {
                return;
            }

            hideLoading();
            resetLocationButton();
            emptyState.hidden = false;

            if (error.code === 1) {
                showError("Location permission was denied. Allow location access in your browser settings or search for a city.");
            } else if (error.code === 2) {
                showError("Your location could not be determined. Check your device location settings or search for a city.");
            } else if (error.code === 3) {
                showError("Location lookup timed out. Please try again or search for a city.");
            } else {
                showError("We couldn't access your location. Please search for a city instead.");
            }
        },
        {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000
        }
    );
}

function refreshLastSearch() {
    if (lastSearchMode === "location" && lastCoordinates) {
        const requestId = ++searchRequestId;
        resetLocationButton();

        const query =
            `lat=${lastCoordinates.latitude}&lon=${lastCoordinates.longitude}`;

        loadWeatherForQuery(
            query,
            requestId,
            "location",
            "",
            lastCoordinates
        );

        return;
    }

    if (lastSearchMode === "city" && lastSearchedCity) {
        handleSearch(lastSearchedCity);
        return;
    }

    if (cityInput.value.trim()) {
        handleSearch();
        return;
    }

    showError("Search for a city or use your location before refreshing.");
}

/* Event listeners */

weatherForm.addEventListener("submit", event => {
    event.preventDefault();
    handleSearch();
});

locationBtn.addEventListener("click", handleLocationSearch);
refreshBtn.addEventListener("click", refreshLastSearch);

celsiusBtn.addEventListener("click", () => {
    temperatureScale = "C";
    updateUnitButtons();
});

fahrenheitBtn.addEventListener("click", () => {
    temperatureScale = "F";
    updateUnitButtons();
});

favouriteBtn.addEventListener("click", () => {
    if (latestWeather?.name) {
        toggleFavourite(latestWeather.name);
    }
});

clearRecentBtn.addEventListener("click", clearRecentCities);

renderSavedCities();
updateFavouriteButton();
setInterval(updateClock, 30000);