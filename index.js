require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

const PORT = process.env.PORT || 3000;

// Example usage of jsonwebtoken:
// const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET, { expiresIn: '1h' });

app.get('/', (req, res) => {
    res.send('Hello, Express!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
