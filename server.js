const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Utility: Read Data
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data) || [];
    } catch (err) {
        console.error("Error reading data:", err);
        return [];
    }
};

// Utility: Write Data
const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// GET: All Data
app.get('/api/data', (req, res) => {
    res.json(readData());
});

// POST: Add New Entry
app.post('/api/data', (req, res) => {
    try {
        let { city, trader, gst } = req.body;
        if (!city || !trader) return res.status(400).json({ error: "City and Trader are required." });

        const newEntry = {
            CITIES: city.trim().toUpperCase(),
            Traders: trader.trim().toUpperCase(),
            GST: gst ? gst.trim().toUpperCase() : "NO GST"
        };

        const currentData = readData();
        const exists = currentData.some(entry => 
            entry.CITIES === newEntry.CITIES && entry.Traders === newEntry.Traders
        );

        if (exists) return res.status(409).json({ error: "Trader already exists in this city." });

        currentData.push(newEntry);
        writeData(currentData);
        res.status(201).json({ message: "Added successfully", entry: newEntry });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// PUT: Update Entry
app.put('/api/data', (req, res) => {
    try {
        const { oldCity, oldTrader, newCity, newTrader, newGST } = req.body;
        const currentData = readData();
        const index = currentData.findIndex(d => d.CITIES === oldCity && d.Traders === oldTrader);
        
        if (index === -1) return res.status(404).json({ error: "Entry not found." });

        if (newCity !== oldCity || newTrader !== oldTrader) {
            const duplicate = currentData.some(d => d.CITIES === newCity.toUpperCase() && d.Traders === newTrader.toUpperCase());
            if (duplicate) return res.status(409).json({ error: "New name/city creates a duplicate." });
        }

        currentData[index] = {
            CITIES: newCity.trim().toUpperCase(),
            Traders: newTrader.trim().toUpperCase(),
            GST: newGST ? newGST.trim().toUpperCase() : "NO GST"
        };

        writeData(currentData);
        res.json({ message: "Updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// DELETE: Remove Entry
app.delete('/api/data', (req, res) => {
    try {
        const { city, trader } = req.body;
        let currentData = readData();
        
        const initialLength = currentData.length;
        currentData = currentData.filter(d => !(d.CITIES === city && d.Traders === trader));
        
        if (currentData.length === initialLength) {
            return res.status(404).json({ error: "Entry not found." });
        }

        writeData(currentData);
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});