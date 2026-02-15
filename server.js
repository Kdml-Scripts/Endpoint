const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Main endpoint that combines both sites
app.get('/api/combined', async (req, res) => {
    try {
        console.log('Fetching data from both sites...');
        
        // Fetch from both sites in parallel
        const [response1, response2] = await Promise.allSettled([
            axios.get('http://addlink1.com', { timeout: 5000 }),
            axios.get('http://addlink2.com', { timeout: 5000 })
        ]);

        const combinedData = [];
        const errors = [];

        // Process first site
        if (response1.status === 'fulfilled' && response1.value.data) {
            const data = response1.value.data;
            data.forEach(item => {
                combinedData.push({
                    ...item,
                    source: 'addlink1.com'
                });
            });
            console.log(`✅ Got ${data.length} items from addlink1.com`);
        } else {
            errors.push('addlink1.com: ' + (response1.reason?.message || 'Failed to fetch'));
        }

        // Process second site
        if (response2.status === 'fulfilled' && response2.value.data) {
            const data = response2.value.data;
            data.forEach(item => {
                combinedData.push({
                    ...item,
                    source: 'addlink2.com'
                });
            });
            console.log(`✅ Got ${data.length} items from addlink2.com`);
        } else {
            errors.push('addlink2.com: ' + (response2.reason?.message || 'Failed to fetch'));
        }

        // Sort by numericMPS (highest first)
        combinedData.sort((a, b) => (b.numericMPS || 0) - (a.numericMPS || 0));

        // Send response
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            total_items: combinedData.length,
            errors: errors.length > 0 ? errors : undefined,
            data: combinedData
        });

        console.log(`✅ Total combined: ${combinedData.length} items`);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Simple endpoint to check status
app.get('/', (req, res) => {
    res.json({
        name: 'Combined Logs API',
        endpoints: {
            combined: '/api/combined',
            health: '/health'
        },
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Combined endpoint: http://localhost:${PORT}/api/combined`);
});
