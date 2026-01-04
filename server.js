const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --------------------
// MongoDB Connection
// --------------------
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// --------------------
// Schema & Model
// --------------------
const TraderSchema = new mongoose.Schema({
    CITIES: { type: String, required: true },
    Traders: { type: String, required: true },
    GST: { type: String, default: 'NO GST' }
});

// Prevent duplicate trader per city
TraderSchema.index({ CITIES: 1, Traders: 1 }, { unique: true });

const Trader = mongoose.model('Trader', TraderSchema);

// --------------------
// API ROUTES
// --------------------

// GET all data
app.get('/api/data', async (req, res) => {
    try {
        const data = await Trader.find().lean();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ADD new entry
app.post('/api/data', async (req, res) => {
    try {
        const entry = {
            CITIES: req.body.city.trim().toUpperCase(),
            Traders: req.body.trader.trim().toUpperCase(),
            GST: req.body.gst?.trim().toUpperCase() || 'NO GST'
        };

        await Trader.create(entry);
        res.status(201).json({ message: 'Added successfully' });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'Trader already exists in this city.'
            });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE entry
app.put('/api/data', async (req, res) => {
    try {
        const { oldCity, oldTrader, newCity, newTrader, newGST } = req.body;

        const updated = await Trader.findOneAndUpdate(
            { CITIES: oldCity, Traders: oldTrader },
            {
                CITIES: newCity.trim().toUpperCase(),
                Traders: newTrader.trim().toUpperCase(),
                GST: newGST?.trim().toUpperCase() || 'NO GST'
            }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Entry not found.' });
        }

        res.json({ message: 'Updated successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE entry
app.delete('/api/data', async (req, res) => {
    try {
        const { city, trader } = req.body;

        const result = await Trader.deleteOne({
            CITIES: city,
            Traders: trader
        });

        if (!result.deletedCount) {
            return res.status(404).json({ error: 'Entry not found.' });
        }

        res.json({ message: 'Deleted successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --------------------
// SPA Fallback
// --------------------
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --------------------
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
