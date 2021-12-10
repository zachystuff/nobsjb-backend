const dotenv = require('dotenv').config();
const { initializeApp } = require('firebase-admin/app');
const express = require('express');
const server = express();
const bodyParser = require('body-parser');
const PORT = 3000;
const cors = require('cors');
const mongo = require('./db');


mongo.initialize();
server.use(cors());

initializeApp({
    credential: applicationDefault(),
    databaseURL: 'https://<DATABASE_NAME>.firebaseio.com'
});

getAuth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
        const uid = decodedToken.uid;
        // ...
    })
    .catch((error) => {
        // Handle error
    });

server.listen(PORT);

server.use(bodyParser.urlencoded({ extended: true }));

server.get('/favorites', (req, res) => {
    console.log('get');
    //get from user, favorite IDs and return jobs with fav IDs
    res.send('got favorites');

});


server.get('/find-jobs', (req, res) => {
    //queries user and jobs, returns jobs based on user
    //if empty request return all jobs
    //else give body params

    res.send('found jobs');
})

server.get('/profile/:ID', (req, res) => {
    //queries user and jobs, returns jobs based on user
    //if empty request return all jobs
    //else give body params
    res.send('user returned');

})

server.post('/create-job', (req, res) => {
    mongo.addData(req)
        //creates job based on form inputs post validation
    res.send('jobs done');
})

server.delete('/favorite/:ID', (req, res) => {
    mongo.deleteJob(req)
    res.send('jobs gone from favorites');
})

server.put('/favorite/:ID', (req, res) => {
    //adds job ID to user favorites list in Mongo
    res.send('job added to favorites');
})

server.put('/apply/:ID', (req, res) => {
    //adds job ID to user applied list in Mongo with epoch time that request was sent
    res.send('job added to applied list');
})

server.put('/ignore/:ID', (req, res) => {
    //adds job ID to user ignored list in Mongo
    //returns list of jobs minus jobs in the ignored list
    res.send('job ignored');
})

server.put('/profile', (req, res) => {
    //adds user to Mongo with default app, fav, and ignore lists (IE: EMPTY LISTS)
    res.send('user added');
})

server.put('/favorite/:ID', (req, res) => {
    //adds job ID to user favorites list in Mongo
    res.send('jobs replaced');
})

server.put('/apply/:ID', (req, res) => {
    //adds job ID to user applied list in Mongo with epoch time that request was sent
    res.send('job added to applied list');
})

server.put('/ignore/:ID', (req, res) => {
    //adds job ID to user ignored list in Mongo
    //returns list of jobs minus jobs in the ignored list
})

server.put('/profile', (req, res) => {
    //adds user to Mongo with default app, fav, and ignore lists (IE: EMPTY LISTS)
    res.send('jobs replaced');
})