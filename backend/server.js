const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const cors = require('cors');
const config = require('./config')

const MAX_IN_DURATION = 4 * 60 * 60 * 1000
const MAX_OUT_DURATION = 26 * 60 * 1000

const app = express();
app.use(express.json());
app.use(cors());

app.get('/punches', (req, res) => {
    const filePath = getTimesheetFilePath();

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
    const filePath = getTimesheetFilePath();

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

const calculateTotalInDuration = (punches) => {
    let totalInDuration = 0;
    let lastInTime = null;

    for (let i = 0; i < punches.length; i++) {
        const punch = punches[i];

        if (punch.isIn) {
            lastInTime = punch.epochMillis;
        } else {
            if (lastInTime !== null) {
                totalInDuration += punch.epochMillis - lastInTime;
                lastInTime = null;
            }
        }
    }

    if (lastInTime !== null) {
        totalInDuration += Date.now() - lastInTime;
    }

    return totalInDuration;
}

const isLunchBreak = () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    return (now.getHours() === 11 && now.getMinutes() >= 50) ||
        (now.getHours() === 12) ||
        (now.getHours() === 13 && now.getMinutes() <= 30);
}

const isNightOrWeekend = () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();

    const isWeekend = (day === 0 || day === 6);
    const isNight = (hour >= 19 || hour < 9);

    return isNight || isWeekend;
}

const maybeText = () => {
    if (isNightOrWeekend) {
        return
    }
    const timesheetFilePath = getTimesheetFilePath();
    fs.readFile(timesheetFilePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return
            } else {
                console.error(err)
            }
        }
        try {
            const punches = JSON.parse(data);
            const lastPunch = punches[punches.length - 1]

            if (!lastPunch) {
                return
            }

            fs.readFile(getTextFilePath(), 'utf8', (err, lastTextTime) => {
                if (err) {
                    if (err.code !== 'ENOENT') {
                        console.error(err)
                        return
                    }
                } else {
                    if (lastTextTime > lastPunch.epochMillis) {
                        return
                    }
                }


                if (lastPunch.isIn) {
                    const inDuration = calculateTotalInDuration(punches)
                    if (inDuration > MAX_IN_DURATION) {
                        sendText("Ok, wrap it up.")
                    }
                } else {
                    if (inDuration < MAX_IN_DURATION && !isLunchBreak && Date.now() - lastPunch.epochMillis > MAX_OUT_DURATION) {
                        sendText("Where you at?")
                    }
                }
            })
        } catch (parseErr) {
            console.error(parseErr)
        }
    });
}
setInterval(maybeText, 60000);


const sendText = (message) => {
    console.log("sending text: " + message);

    fs.writeFile(getTextFilePath(), JSON.stringify(Date.now()), (err) => {
        if (err) {
            console.error(err)
            return
        }
    });

    const client = require('twilio')(config.twilioAccountSid, config.twilioAuthToken);

    client.messages
        .create({
            body: message,
            from: '+18556530788',
            to: config.phoneNumber
        })
        .then(message => console.log(message.sid))
        .catch(error => console.error('Error sending message:', error));
};

function getTextFilePath() {
    const filename = 'lastText.json';
    return path.join(__dirname, "data", filename);
}

function getTimesheetFilePath() {
    const currentDate = moment().tz('America/Los_Angeles');
    const filename = currentDate.format('YYYYMMDD') + '_timesheet.json';
    return path.join(__dirname, "data", filename);
}

app.listen(5001, '0.0.0.0', () => {
    console.log('Server is running on port 5001');
});
