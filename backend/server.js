const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors')

const app = express();
app.use(express.json());

app.use(cors())

app.get('/punches', (req, res) => {

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                var punches = [];
            } else {
                return res.status(500).send('Error reading file');
            }
        } else {
            try {
                punches = JSON.parse(data);
            } catch (parseErr) {
                return res.status(500).send('Error parsing JSON data');
            }
        }
    })
    res.send(punches);
})

app.post('/punch', (req, res) => {
    const punch = req.body;
    const filePath = path.join(__dirname, 'timesheet.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                var punches = [];
            } else {
                return res.status(500).send('Error reading file');
            }
        } else {
            try {
                punches = JSON.parse(data);
            } catch (parseErr) {
                return res.status(500).send('Error parsing JSON data');
            }
        }

        // Append the new punch
        punches.push(punch);

        // Write the updated timesheet back to the file
        fs.writeFile(filePath, JSON.stringify(punches, null, 2), (err) => {
            if (err) {
                return res.status(500).send('Error writing file');
            }
            res.send(punches);
        });
    });
});

app.listen(5001, () => {
    console.log('Server is running on port 5001');
});
