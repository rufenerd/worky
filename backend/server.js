const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/punches', (req, res) => {
    const filePath = getFilePath();

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.send([]);
            } else {
                return res.status(500).send('Error reading file');
            }
        }
        try {
            const punches = JSON.parse(data);
            res.send(punches);
        } catch (parseErr) {
            return res.status(500).send('Error parsing JSON data');
        }
    });
});

app.post('/punch', (req, res) => {
    const punch = req.body;
    const filePath = getFilePath();

    fs.readFile(filePath, 'utf8', (err, data) => {
        let punches = [];
        if (!err) {
            try {
                punches = JSON.parse(data);
            } catch (parseErr) {
                return res.status(500).send('Error parsing JSON data');
            }
        }

        punches.push(punch);

        fs.writeFile(filePath, JSON.stringify(punches, null, 2), (err) => {
            if (err) {
                return res.status(500).send(`Error writing file ${err}`);
            }
            res.send(punches);
        });
    });
});

function getFilePath() {
    const currentDate = moment().tz('America/Los_Angeles');
    const filename = currentDate.format('YYYYMMDD') + '_timesheet.json';
    return path.join(__dirname, "data", filename);
}

app.listen(5001, '0.0.0.0', () => {
    console.log('Server is running on port 5001');
});
