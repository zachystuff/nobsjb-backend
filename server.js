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


server.use(async function (req, res, next) {
    //rerieve token from front end
    const {
        idToken
    } = req.body;
    try {
        const verifiedToken = await firebase.auth().verifyIdToken(idToken.toString());
        req.body.idToken = verifiedToken.uid;
        next();
    } catch (err) {
        console.error(err.stack);
        res.status(500).send('unable to verify user (because of Michael and Zach)');
    }
});


/*
 *
 * JOB COLLECTION ROUTES
 *
 */

server.get('/favorites', async (req, res) => {

    res.send('got favorites');
});


server.get('/find-jobs', (req, res) => {
    //if empty request return all jobs
    //else give body params
    let results = mongo.jobDb.readJobListing(req)
    console.log(results);
    res.send(results);

});



server.post('/create-job', (req, res) => {

    //const {}
    mongo.jobDb.addJobListing(req)
    //creates job based on form inputs post validation
    res.send('jobs done');
});

/*
 *
 * USER COLLECTION ROUTES
 *
 */

server.get('/profile', (req, res) => {

    const {
        salary
    } = req.body;
    res.send('user returned');

});

server.post('/create-user', (req, res) => {
    const {
        idToken,
        salary
    } = req.body;
    let newSalary = parseFloat(salary);
    if (typeof newSalary != "number" && newSalary < 0) {
        res.send("Salary must be a number greater than 0.")
        return;
    }
    console.log("/create user function");
    const userObj = {
        ignored: [],
        favorites: [],
        applied: [],
        desiredsalary: newSalary,
        idToken: idToken
    }
    try {
        let result = mongo.userDb.addUserProfile(userObj);
        console.log(result);
        res.sendStatus(200);
    } catch (err) {
        res.sendStatus(500);
        return console.error(err);
    }
});

server.delete('/favorite', (req, res) => {    
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            mongo.userDb.deleteUserDataFromCollection(idToken, { "favorites": jobId });
            res.send('jobs gone from favorites');

        } catch (err) {
            console.log(err);
        }
    } else {
        res.sendStatus(400);
    }
});


server.put('/profile', (req, res) => {
    let user;
    mongo.userDb.updateUserProfile(user)
    //updates user in mongo
    res.send('user added');
});

server.put('/favorite', (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            mongo.userDb.updateUserProfile(idToken, {"favorites": jobId});
            //adds job ID to user favorites list in Mongo
            res.send('jobs replaced');

        } catch (err) {
            console.log(err);
        }
    } else {
        res.sendStatus(400);
    }
});

server.put('/apply', (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    const applyObj = {
        jobId,
        dateAdded: new Date()
    }
    if (jobId) {
        try {
            mongo.userDb.updateUserProfile(idToken, {"applied": applyObj});
            //adds job ID to user favorites list in Mongo
            res.send('applied to ' + jobId + ' on ' + applyObj.dateAdded);

        } catch (err) {
            console.log(err);
        }
    } else {
        res.sendStatus(400);
    }
});

server.put('/ignore', (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            mongo.userDb.updateUserProfile(idToken, {"ignored": jobId});
            //adds job ID to user favorites list in Mongo
            res.send('ignored updated');

        } catch (err) {
            console.log(err);
        }
    } else {
        res.sendStatus(400);
    }
});


server.listen(process.env.PORT, () => {
    console.log("Server is listening on port " + process.env.PORT);
});