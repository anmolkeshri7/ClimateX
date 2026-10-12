 // ClimateX — Step 9: Search Logic

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");

const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const weatherCard = document.getElementById("weatherCard");
const emptyState = document.getElementById("emptyState");

// Display an error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

// Clear an existing error
function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

// Show loading feedback
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

// Handle city search
function handleSearch() {
    const city = cityInput.value.trim();

    clearError();

    // Validate empty input
    if (city === "") {
        showError("Please enter a city name.");
        cityInput.focus();
        return;
    }

    // Basic input validation
    if (!/^[a-zA-ZÀ-ÿ\s.'-]+$/.test(city)) {
        showError("Please enter a valid city name using letters.");
        cityInput.focus();
        return;
    }

    // Prepare the interface for the next step
    weatherCard.hidden = true;
    emptyState.hidden = true;

    showLoading();

    // Temporary simulation until API integration
    window.setTimeout(() => {
        hideLoading();

        showError(
            "Search interface is ready. Live weather will be available after API integration."
        );

        emptyState.hidden = false;
    }, 700);
}

// Search button click
searchBtn.addEventListener("click", handleSearch);

// Search when Enter is pressed
cityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        handleSearch();
    }
});
