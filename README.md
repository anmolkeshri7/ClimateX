# 🌤️ ClimateX — Weather Forecast App

ClimateX is a responsive weather application that provides current weather conditions, hourly forecasts, a five-day forecast, and useful weather insights through the OpenWeatherMap API.

🌐 **Live Demo:** [ClimateX](https://climate-x.streamlit.app/)

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
- Python
- Flask
- OpenWeatherMap API
- Fetch API
- Browser Local Storage
- Geolocation API
- SVG for temperature trend visualization
- Python Requests
- python-dotenv

## 📁 Project Structure

```text
ClimateX/
├── images/
│   ├── logo.png
│   └── background.png
├── index.html
├── style.css
├── scripts.js
├── sun-times.html
├── app.py
├── requirements.txt
├── .env
├── .gitignore
└── README.md
```

**Note:** `.env` contains your private API key and must remain excluded from GitHub.

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd ClimateX
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 3. Configure the API key

Create a `.env` file in the project root:

```env
OPENWEATHER_API_KEY=your_api_key_here
```

Get your API key from [OpenWeatherMap](https://openweathermap.org/api).

Keep the `.env` file private and never commit it to GitHub.

### 4. Run the application

Start the Flask backend:

```bash
python app.py
```

Open ClimateX in your browser:

```text
http://127.0.0.1:5000
```

**Important:** Run the application through Flask instead of VS Code Live Server because the frontend communicates with Flask API endpoints.

## 🔑 API

ClimateX uses the OpenWeatherMap API to retrieve current weather and forecast information.

API requests are handled through the Flask backend.

API availability and usage limits depend on your OpenWeatherMap account.

## 📸 Screenshots

Add screenshots of the following pages after capturing them locally:

- Main weather dashboard
- Hourly forecast and temperature chart
- Five-day forecast
- Sunrise and sunset page

Place screenshots in a `screenshots/` folder and embed them here using relative image paths.

## 🔒 Security

- Keep API credentials out of public repositories.
- Never commit `.env` or other files containing API keys.
- Store API credentials using environment variables.
- Use the Flask backend to protect API credentials from direct exposure in frontend JavaScript.
- Restrict API usage where supported.

## 👨‍💻 Author

**Anmol Keshri**

B.Tech Computer Science Engineering

GitHub: [@anmolkeshri7](https://github.com/anmolkeshri7)

## 📄 License

Choose a license before distributing or reusing this project.
