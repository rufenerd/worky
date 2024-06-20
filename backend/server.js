const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: 5432,
});

const app = express();
app.use(express.json());
app.use(cors());

app.get('/punches', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM punches ORDER BY epochMillis ASC');
        res.send(result.rows);
    } catch (error) {
        res.status(500).send('Error retrieving punches from database');
    }
});

app.post('/punch', async (req, res) => {
    const { isIn, epochMillis } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO punches (isIn, epochMillis) VALUES ($1, $2) RETURNING *',
            [isIn, epochMillis]
        );
        res.send(result.rows);
    } catch (error) {
        res.status(500).send('Error storing punch in database');
    }
});

app.listen(5001, '0.0.0.0', () => {
    console.log('Server is running on port 5001');
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
    if (isNightOrWeekend()) {
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


                const inDuration = calculateTotalInDuration(punches)

                if (lastPunch.isIn) {
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

    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    client.messages
        .create({
            body: message,
            from: '+18556530788',
            to: process.env.PHONE_NUMBER
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