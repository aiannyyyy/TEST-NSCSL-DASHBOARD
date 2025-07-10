 const apiKey = 'a750bc4606f0dc6c29f1041e4cd1080c';

        const provinces = [
            { name: 'Batangas', short: 'BAT' },
            { name: 'Cavite', short: 'CAV' },
            { name: 'Rizal', short: 'RIZ' },
            { name: 'Quezon', short: 'QUE' },
            { name: 'Laguna', short: 'LAG' }
        ];

        let currentProvinceIndex = 0;
        let weatherData = {};
        let isLoading = false;

        const emojiMap = {
            Clear: '☀️',
            Clouds: '☁️',
            Rain: '🌧️',
            Drizzle: '🌦️',
            Thunderstorm: '⛈️',
            Mist: '🌫️',
            Haze: '🌫️',
            Fog: '🌫️',
            Snow: '❄️'
        };

        function getEmoji(condition) {
            return emojiMap[condition] || '🌤️';
        }

        function getConditionClass(condition) {
            return condition.toLowerCase().replace(/\s/g, '');
        }

        function formatShortDate(date) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()];
        }

        async function fetchCurrentWeather(province) {
            try {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${province.name},PH&appid=${apiKey}&units=metric`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                const condition = data.weather[0].main;

                return {
                    temp: Math.round(data.main.temp),
                    condition: condition,
                    icon: getEmoji(condition),
                    timestamp: new Date(),
                    description: data.weather[0].description,
                    humidity: data.main.humidity,
                    windSpeed: data.wind.speed
                };
            } catch (error) {
                console.error(`Error fetching current weather for ${province.name}:`, error);
                return {
                    temp: '--',
                    condition: 'Error',
                    icon: '❌',
                    timestamp: new Date(),
                    description: 'Unable to load weather data'
                };
            }
        }

        async function fetchForecast(province) {
            try {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${province.name},PH&appid=${apiKey}&units=metric`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Group forecast data by day
                const dailyForecasts = {};
                
                data.list.forEach(item => {
                    const date = new Date(item.dt * 1000);
                    const dateKey = date.toDateString();
                    
                    // Prefer forecasts around noon (12:00) for better accuracy
                    if (!dailyForecasts[dateKey] || 
                        Math.abs(date.getHours() - 12) < Math.abs(new Date(dailyForecasts[dateKey].dt * 1000).getHours() - 12)) {
                        dailyForecasts[dateKey] = item;
                    }
                });
                
                // Convert to array and take first 5 days
                const forecastArray = Object.values(dailyForecasts)
                    .slice(0, 5)
                    .map(item => {
                        const date = new Date(item.dt * 1000);
                        const condition = item.weather[0].main;
                        return {
                            date: date,
                            temp: Math.round(item.main.temp),
                            condition: condition,
                            icon: getEmoji(condition),
                            description: item.weather[0].description
                        };
                    });
                
                return forecastArray;
            } catch (error) {
                console.error(`Error fetching forecast for ${province.name}:`, error);
                return [];
            }
        }

        async function fetchWeather(province) {
            try {
                const [currentWeather, forecast] = await Promise.all([
                    fetchCurrentWeather(province),
                    fetchForecast(province)
                ]);
                
                weatherData[province.short] = {
                    current: currentWeather,
                    forecast: forecast
                };
                
                return true;
            } catch (error) {
                console.error(`Error fetching weather for ${province.name}:`, error);
                return false;
            }
        }

        async function refreshWeather() {
            if (isLoading) return;
            
            isLoading = true;
            const widget = document.getElementById('weather-widget');
            const refreshBtn = document.getElementById('refresh-btn');
            const refreshText = document.getElementById('refresh-text');
            const locationName = document.getElementById('location-name');
            
            // Update UI to show loading state
            refreshBtn.disabled = true;
            refreshText.innerHTML = '<span class="spinner"></span>';
            locationName.textContent = 'Loading...';
            
            widget.classList.remove('error');
            widget.classList.add('loading');
            
            try {
                // Fetch weather data for all provinces
                const promises = provinces.map(province => fetchWeather(province));
                await Promise.all(promises);
                
                // Update display with current province
                updateDisplay();
                
                widget.classList.remove('loading');
                
            } catch (error) {
                console.error('Error refreshing weather:', error);
                widget.classList.add('error');
                widget.classList.remove('loading');
                locationName.textContent = 'Error loading weather data';
                document.getElementById('weather-condition').textContent = 'Please try again later';
            } finally {
                isLoading = false;
                refreshBtn.disabled = false;
                refreshText.innerHTML = '🔄';
            }
        }

        function updateDisplay() {
            const province = provinces[currentProvinceIndex];
            const data = weatherData[province.short];

            if (!data || !data.current) {
                console.warn(`No weather data available for ${province.name}`);
                return;
            }

            const current = data.current;
            
            // Update current weather display
            document.getElementById('current-temp').textContent = `${current.temp}°C`;
            document.getElementById('current-icon').textContent = current.icon;
            document.getElementById('location-name').textContent = province.name;
            document.getElementById('weather-condition').textContent = current.description;

            // Update forecast display
            const forecastContainer = document.getElementById('forecast-container');
            if (data.forecast && data.forecast.length > 0) {
                forecastContainer.innerHTML = data.forecast.map(day => `
                    <div class="forecast-day-compact">
                        <div class="forecast-date-compact">${formatShortDate(day.date)}</div>
                        <div class="forecast-icon-compact">${day.icon}</div>
                        <div class="forecast-temp-compact">${day.temp}°</div>
                    </div>
                `).join('');
            } else {
                forecastContainer.innerHTML = '<div class="forecast-day-compact">No forecast</div>';
            }

            // Update weather widget background
            const widget = document.getElementById('weather-widget');
            widget.className = 'weather-widget'; // Reset classes
            widget.classList.add(getConditionClass(current.condition));

            // Update navigation dots
            const dotsContainer = document.getElementById('province-dots');
            dotsContainer.innerHTML = provinces.map((_, i) =>
                `<div class="dot ${i === currentProvinceIndex ? 'active' : ''}" onclick="goToProvince(${i})"></div>`
            ).join('');

            // Update navigation buttons
            document.getElementById('prev-btn').disabled = currentProvinceIndex === 0;
            document.getElementById('next-btn').disabled = currentProvinceIndex === provinces.length - 1;
        }

        function nextProvince() {
            if (currentProvinceIndex < provinces.length - 1) {
                currentProvinceIndex++;
                updateDisplay();
            }
        }

        function previousProvince() {
            if (currentProvinceIndex > 0) {
                currentProvinceIndex--;
                updateDisplay();
            }
        }

        function goToProvince(index) {
            if (index >= 0 && index < provinces.length) {
                currentProvinceIndex = index;
                updateDisplay();
            }
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                previousProvince();
            } else if (e.key === 'ArrowRight') {
                nextProvince();
            } else if (e.key === 'r' || e.key === 'R') {
                refreshWeather();
            }
        });

        // Auto-refresh every 10 minutes
        setInterval(refreshWeather, 600000);

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            refreshWeather();
        });

        // Handle visibility change to refresh when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Check if data is older than 5 minutes
                const now = new Date().getTime();
                const currentData = weatherData[provinces[currentProvinceIndex].short];
                if (currentData && currentData.current && currentData.current.timestamp) {
                    const lastUpdate = currentData.current.timestamp.getTime();
                    if (now - lastUpdate > 300000) { // 5 minutes
                        refreshWeather();
                    }
                }
            }
        });