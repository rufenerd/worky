const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const pool = new Pool({
    user: 'your_username', // replace with your PostgreSQL username
    host: 'localhost',
    database: 'punches_db',
    password: 'your_password', // replace with your PostgreSQL password
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
