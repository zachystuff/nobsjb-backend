const dotenv = require('dotenv').config();
const express = require('express');
const server = express();
const bodyParser = require('body-parser');
const PORT = 3000;
const cors = require('cors');
const mongo = require('./db');

mongo.initialize();
server.use(cors());

server.listen(PORT);

server.use(bodyParser.urlencoded({ extended: true }));

server.get('/', (req, res) => {
    console.log('get');
    res.send('Hello World!');
});

server.post('/', (req, res) => {
    mongo.addData(req)
    res.send('jobs done');
})

server.delete('/', (req, res) => {
    mongo.deleteJob(req)
    res.send('jobs gone');
})

server.put('/', (req, res) => {
    res.send('jobs replaced');
})