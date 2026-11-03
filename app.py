
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

# Project directory
BASE_DIR = Path(__file__).resolve().parent

# Load API key from local .env file
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)

API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()

WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"


# -------------------- Frontend Pages --------------------

@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/sun-times.html")
def sun_times():
    return send_from_directory(BASE_DIR, "sun-times.html")


@app.route("/style.css")
def stylesheet():
    return send_from_directory(BASE_DIR, "style.css")


@app.route("/scripts.js")
def javascript():
    return send_from_directory(BASE_DIR, "scripts.js")


@app.route("/image/<path:filename>")
def image_file(filename):
    return send_from_directory(BASE_DIR / "image", filename)


# -------------------- Weather API Proxy --------------------

def fetch_weather(endpoint):
    """Fetch weather data without exposing the API key to the browser."""

    if not API_KEY:
        return jsonify({
            "message": "Weather API key is not configured on the server."
        }), 503

    city = request.args.get("q", "").strip()
    lat_value = request.args.get("lat", "").strip()
    lon_value = request.args.get("lon", "").strip()

    params = {
        "appid": API_KEY,
        "units": "metric"
    }

    # Search by city
    if city:
        if len(city) > 80:
            return jsonify({
                "message": "City name must be 80 characters or fewer."
            }), 400

        params["q"] = city

    # Search by coordinates
    elif lat_value or lon_value:
        if not lat_value or not lon_value:
            return jsonify({
                "message": "Both latitude and longitude are required."
            }), 400

        try:
            latitude = float(lat_value)
            longitude = float(lon_value)
        except ValueError:
            return jsonify({
                "message": "Invalid latitude or longitude."
            }), 400

        if not (-90 <= latitude <= 90):
            return jsonify({
                "message": "Latitude must be between -90 and 90."
            }), 400

        if not (-180 <= longitude <= 180):
            return jsonify({
                "message": "Longitude must be between -180 and 180."
            }), 400

        params["lat"] = latitude
        params["lon"] = longitude

    else:
        return jsonify({
            "message": "Enter a city or provide latitude and longitude."
        }), 400

    try:
        response = requests.get(
            endpoint,
            params=params,
            timeout=10
        )

        try:
            data = response.json()
        except ValueError:
            return jsonify({
                "message": "Invalid response from the weather service."
            }), 502

        return jsonify(data), response.status_code

    except requests.RequestException:
        return jsonify({
            "message": "Unable to connect to the weather service. Please try again."
        }), 502


@app.route("/api/weather", methods=["GET"])
def current_weather():
    return fetch_weather(WEATHER_URL)


@app.route("/api/forecast", methods=["GET"])
def weather_forecast():
    return fetch_weather(FORECAST_URL)


# -------------------- Start Application --------------------

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )
