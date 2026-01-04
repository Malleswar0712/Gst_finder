const state = {
    data: [],
    currentCity: null,
    currentTrader: null
};

// --- API Functions ---
async function fetchData() {
    try {
        const res = await fetch('/api/data');
        state.data = await res.json();
        
        // Handle browser Back/Forward buttons
        window.addEventListener('popstate', (event) => {
            if (!event.state) {
                // If no state, we are at home (Cities)
                renderCities(null, false); 
            } else if (event.state.view === 'traders') {
                state.currentCity = event.state.city;
                renderTraders(event.state.city, null, false);
            } else if (event.state.view === 'gst') {
                state.currentCity = event.state.city;
                state.currentTrader = state.data.find(d => 
                    d.CITIES === event.state.city && d.Traders === event.state.trader
                );
                showView('view-gst');
            }
        });

        // Initial Load
        renderCities(null, false);

    } catch (err) {
        console.error(err);
        alert("Server error: Could not load data.");
    }
}

async function postEntry(entry) {
    return await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    });
}

async function updateEntry(payload) {
    return await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function deleteEntry() {
    if (!confirm(`Are you sure you want to delete ${state.currentTrader.Traders}?`)) return;

    const payload = {
        city: state.currentTrader.CITIES,
        trader: state.currentTrader.Traders
    };

    const res = await fetch('/api/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        await fetchData();
        bootstrap.Modal.getInstance(document.getElementById('editEntryModal')).hide();
        // Go back 2 steps (out of GST view, out of Traders view) or reset to home
        window.location.reload(); 
    } else {
        alert("Failed to delete entry");
    }
}

// --- View Logic ---
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    const nav = document.getElementById('nav-controls');
    const breadcrumb = document.getElementById('breadcrumb');
    
    // Clear search on view change
    document.getElementById('searchInput').value = '';
    
    if (viewId === 'view-cities') {
        nav.classList.add('d-none');
    } else {
        nav.classList.remove('d-none');
        if(viewId === 'view-traders') breadcrumb.innerText = `${state.currentCity}`;
        if(viewId === 'view-gst') breadcrumb.innerText = `${state.currentCity} > ${state.currentTrader.Traders}`;
    }
}

// --- Render Functions ---
// 'pushHistory' param prevents infinite loops when pressing Back button
function renderCities(filter = '', pushHistory = true) {
    if (pushHistory) {
        history.pushState(null, '', null); // Reset to base
    }

    let cities = [...new Set(state.data.map(item => item.CITIES))].sort();
    
    if (filter) {
        cities = cities.filter(city => city.includes(filter.toUpperCase()));
    }
    
    const container = document.getElementById('cities-container');
    
    if (cities.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">No cities found</div>';
    } else {
        container.innerHTML = cities.map(city => `
            <div class="col-md-4 col-sm-6">
                <div class="card hover-card p-4 text-center" onclick="selectCity('${city}')">
                    <h5 class="m-0 text-primary fw-bold">${city}</h5>
                    <small class="text-muted">${state.data.filter(d => d.CITIES === city).length} Traders</small>
                </div>
            </div>
        `).join('');
    }
    
    showView('view-cities');
}

function renderTraders(city, filter = '', pushHistory = true) {
    if (pushHistory) {
        history.pushState({ view: 'traders', city: city }, '', `#${city}`);
    }

    let traders = state.data.filter(item => item.CITIES === city);

    if (filter) {
        traders = traders.filter(item => item.Traders.includes(filter.toUpperCase()));
    }

    const container = document.getElementById('traders-container');

    if (traders.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">No traders found</div>';
    } else {
        container.innerHTML = traders.map((item) => `
            <div class="col-md-6">
                <div class="card hover-card p-3" onclick="selectTrader('${item.Traders}')">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="m-0 fw-bold">${item.Traders}</h6>
                        <i class="bi bi-chevron-right text-muted"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showView('view-traders');
}

// --- Interaction Functions ---
function selectCity(city) {
    state.currentCity = city;
    renderTraders(city); // This triggers the pushState inside renderTraders
}

function selectTrader(traderName) {
    const entry = state.data.find(d => d.CITIES === state.currentCity && d.Traders === traderName);
    state.currentTrader = entry;
    
    // Push History State for GST View
    history.pushState({ view: 'gst', city: state.currentCity, trader: traderName }, '', `#${state.currentCity}/${traderName}`);
    
    document.getElementById('gst-trader-name').innerText = entry.Traders;
    document.getElementById('gst-number').innerText = entry.GST;
    showView('view-gst');
}

function handleSearch() {
    const val1 = document.getElementById('searchInput').value;
    const val2 = document.getElementById('searchInputMobile') ? document.getElementById('searchInputMobile').value : '';
    const query = (val1 || val2).trim();

    if (document.getElementById('view-cities').classList.contains('active')) {
        renderCities(query, false); // Don't push history on every keypress
    } else if (document.getElementById('view-traders').classList.contains('active')) {
        renderTraders(state.currentCity, query, false);
    }
}

// This now uses the browser's native back functionality
function goBack() {
    window.history.back();
}

function openEditModal() {
    if (!state.currentTrader) return;
    document.getElementById('editCity').value = state.currentTrader.CITIES;
    document.getElementById('editTrader').value = state.currentTrader.Traders;
    document.getElementById('editGST').value = state.currentTrader.GST;
    new bootstrap.Modal(document.getElementById('editEntryModal')).show();
}

function toggleFullScreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
}

// --- Forms ---
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('addAlert');
    alertBox.classList.add('d-none');

    const payload = {
        city: document.getElementById('inputCity').value,
        trader: document.getElementById('inputTrader').value,
        gst: document.getElementById('inputGST').value
    };

    const response = await postEntry(payload);
    
    if (response.ok) {
        window.location.reload(); // Simplest way to refresh state cleanly
    } else {
        const errData = await response.json();
        alertBox.innerText = errData.error;
        alertBox.classList.remove('d-none');
    }
});

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('editAlert');
    alertBox.classList.add('d-none');

    const payload = {
        oldCity: state.currentTrader.CITIES,
        oldTrader: state.currentTrader.Traders,
        newCity: document.getElementById('editCity').value,
        newTrader: document.getElementById('editTrader').value,
        newGST: document.getElementById('editGST').value
    };

    const response = await updateEntry(payload);

    if (response.ok) {
        alert("Updated Successfully");
        window.location.reload(); // Refresh to ensure data integrity
    } else {
        const errData = await response.json();
        alertBox.innerText = errData.error;
        alertBox.classList.remove('d-none');
    }
});

document.addEventListener('DOMContentLoaded', fetchData);