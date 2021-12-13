const dotenv = require('dotenv').config();
const express = require('express');
const firebase = require('firebase-admin');
const server = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongo = require('./db');
const morgan = require('morgan');
const serviceAccount = require('./firebaselogin.json');

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount)
});

server.use(cors());
server.use(express.json());
server.use(bodyParser.urlencoded({
    extended: true
}));
server.use(cookieParser());
// request logger
server.use(morgan('tiny'));

/*
 *
 * FIREBASE MIDDLEWARE
 *
 */


server.use(async function(req, res, next) {
    //rerieve token from front end
    const { idToken } = req.body;
    console.log("firebase middleware");
    console.log(idToken);
    console.log(idToken.toString());

    try {
        const verifiedToken = await firebase.auth().verifyIdToken(idToken.toString());
        req.body.idToken = verifiedToken.uid;
        next();
    } catch (err) {
        console.error(err.stack)
        res.status(500).send('unable to verify user (because of Michael and Zach)')
    }
})


/*
 *
 * JOB COLLECTION ROUTES
 *
 */


/*
 *
 * USER COLLECTION ROUTES
 *
 */


server.get('/favorites', async(req, res) => {
    console.log('get');
    res.send('got favorites');
});


server.get('/find-jobs', (req, res) => {
    let results = mongo.jobDb.readJobListing(req)
    console.log(results);
    res.send(results);

})

server.get('/profile', (req, res) => {
    //if empty request return all jobs
    //else give body params
    const {
        salary
    } = req.body;
    res.send('user returned');

})

server.post('/create-job', (req, res) => {
    mongo.jobDb.addJobListing(req)
        //creates job based on form inputs post validation
    res.send('jobs done');
})

server.post('/create-user', (req, res) => {
    console.log("/create user function");
    const userObj = {
        ingnored: [],
        favorites: [],
        applied: [],
        desiredsalary: 100000,
        email
    }
    const dbResponse = mongo.userDb.addUserProfile(userObj);
    console.log(dbResponse);
    res.sendStatus(200);
})

server.delete('/favorite', (req, res) => {
    const {
        id
    } = req.body;
    mongo.deleteJob(req)
    res.send('jobs gone from favorites');
})

server.put('/favorite', (req, res) => {
    console.log(req.body);
    //adds job ID to user favorites list in Mongo
    res.send('job added to favorites');
})

server.put('/apply', (req, res) => {
    //adds job ID to user applied list in Mongo with epoch time that request was sent
    res.send('job added to applied list');
})

server.put('/ignore', (req, res) => {
    //adds job ID to user ignored list in Mongo
    //returns list of jobs minus jobs in the ignored list
    res.send('job ignored');
})

server.put('/profile', (req, res) => {
    //adds user to Mongo with default app, fav, and ignore lists (IE: EMPTY LISTS)
    res.send('user added');
})

server.put('/favorite', (req, res) => {
    //adds job ID to user favorites list in Mongo
    res.send('jobs replaced');
})

server.put('/apply', (req, res) => {
    //adds job ID to user applied list in Mongo with epoch time that request was sent
    res.send('job added to applied list');
})

server.put('/ignore', (req, res) => {
    //adds job ID to user ignored list in Mongo
    //returns list of jobs minus jobs in the ignored list
})

server.put('/profile', (req, res) => {
    //adds user to Mongo with default app, fav, and ignore lists (IE: EMPTY LISTS)
    res.send('jobs replaced');
})

server.listen(process.env.PORT, () => {
    console.log("Server is listening on port " + process.env.PORT);
});