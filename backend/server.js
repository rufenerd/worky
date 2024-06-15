const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5001;

app.use(bodyParser.json());

// Use CORS middleware
app.use(cors());

// Endpoint to handle storing data
app.post('/store-data', (req, res) => {
    const data = req.body;
    const filePath = path.join(__dirname, 'data.json');

    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            return res.status(500).send('Error writing file');
        }
        res.send('Data saved successfully');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
