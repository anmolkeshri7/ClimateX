# 🌤️ ClimateX — Weather Forecast App

ClimateX is a responsive weather application built with HTML, CSS, and JavaScript. It provides current weather conditions, hourly forecasts, a five-day forecast, and useful weather insights through the OpenWeatherMap API.

## ✨ Features

- 🌍 Search weather by city
- 📍 Get weather using your current location
- 🌡️ Switch between Celsius and Fahrenheit
- 🕒 View current date and local weather time
- 📊 Explore hourly forecasts and temperature trends
- 📅 Check the five-day weather forecast
- 💡 Get helpful weather insights
- ⭐ Save favourite cities
- 🕘 Access recent city searches
- 🎨 Dynamic weather themes
- 🌅 View sunrise, sunset, and daylight duration

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript
- OpenWeatherMap API
- Fetch API
- Browser Local Storage
- Geolocation API
- SVG for temperature trend visualization

## 📁 Project Structure

```text
ClimateX/
├── image/
│   ├── logo.png
│   └── background.png
├── index.html
├── style.css
├── scripts.js
├── sun-times.html
├── config.js
├── .gitignore
└── README.md
```

**Note:** `config.js` contains your API key and should remain excluded from GitHub.

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd ClimateX
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### 2. Configure the API key

Create a local `config.js` file in the project root. Add your OpenWeatherMap API key using the variable name expected by `scripts.js`.

Keep this file private and do not commit it to GitHub.

### 3. Run the application

Open `index.html` using the VS Code Live Server extension.

Search for a city to view its weather information.

## 🔑 API

ClimateX uses the OpenWeatherMap API for current weather conditions and forecast data.

Get an API key from: https://openweathermap.org/api

API availability and usage limits depend on your OpenWeatherMap account.

## 📸 Screenshots

Add screenshots of the following pages after capturing them locally:

- Main weather dashboard
- Hourly forecast and temperature chart
- Five-day forecast
- Sunrise and sunset page

You can place screenshots in a `screenshots/` folder and embed them here using relative image paths.

## 🔒 Security

- Keep API credentials out of public repositories.
- Never commit `config.js` if it contains your API key.
- Restrict API usage where supported.
- For public production deployment, consider a backend proxy because API keys used directly in browser JavaScript can be exposed.

## 👨‍💻 Author

**Anmol Keshri**

B.Tech Computer Science Engineering

## 📄 License

Choose a license before distributing or reusing this project.