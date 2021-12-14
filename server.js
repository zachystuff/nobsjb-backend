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
const { app } = require('firebase-admin');

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

const skipAuth = function(path) {
    return function(req, res, next) {
        if (path === req.path && !req.body.idToken) {
            return next();
        } else {
            server.use(async function(req, res, next) {
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
            })
        }
    }
}

server.use(skipAuth('/find-jobs'));

/*
 *
 * JOB COLLECTION ROUTES
 *
 */

server.get('/favorites', async(req, res) => {
    const { idToken } = req.body;
    if (idToken) {
        try {
            const { favorites } = mongo.userDb.getUserProfile(idToken);
            const favoritesResults = mongo.jobDb.readJobListing({ "$and": [{ favorites }] });
            res.send('got favorites');
            return favoritesResults;
        } catch (err) {
            res.send(500);
            console.error(err);
        }
    } else {
        res.sendStatus(400);
    }
});


server.get('/find-jobs', async(req, res) => {

    //returns all jobs by search term or if empty, returns all jobs. Will not return jobs that are ignored!
    if (Object.keys(req.body).length !== 0) {
        const { location, title } = req.body;
        const search = {
            "$and": [
                { "$elemMatch": { location } },
                { "$elemMatch": { title } }
            ]
        }

        try {
            console.log(search);
            let results = await mongo.jobDb.readJobListing(search);
            res.send(results);
        } catch (err) {
            res.sendStatus(500);
            return console.error(err);
        }
    } //else {
    try {
        mongo.jobDb.readJobListing()
            .then(results => {
                res.json(results);
            })

    } catch (err) {
        res.sendStatus(500);
        return console.error(err);
    }
    //}

});



server.post('/create-job', (req, res) => {
    const { title, company, type, benefits, salary, qualifications, description, location } = req.body;

    if (!title && !company && !type && !benefits && !salary && !qualifications && !description && !location) {
        res.end("Missing required variables")
        return;
    }

    if (typeof title != 'string'

        &&
        typeof company != 'string'

        &&
        typeof location != 'string'

        &&
        typeof type != 'string'

        &&
        typeof benefits != 'string'

        &&
        typeof salary != 'string'

        &&
        typeof qualifications != 'string'

        &&
        typeof description != 'string') {
        res.end("All variables need to be in string format");
    }
    const newSalary = parseFloat(salary);
    const newJob = {
        title: title,
        company: company,
        type: type,
        benefits: benefits,
        salary: newSalary,
        qualifications: qualifications,
        description: description,
        location: location
    }

    try {
        mongo.jobDb.addJobListing(newJob);
        //creates job based on form inputs post validation
        res.send(JSON.stringify({
            "status": "success"
        }));
    } catch (err) {
        res.sendStatus(500);
        return console.error(err);
    }
});



/*
 *
 * USER COLLECTION ROUTES
 *
 */

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

server.delete('/ignore', (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            mongo.userDb.deleteUserDataFromCollection(idToken, { "ignored": jobId });
            //adds job ID to user favorites list in Mongo
            res.send('ignored updated');

        } catch (err) {
            console.log(err);
        }
    } else {
        res.sendStatus(400);
    }
});



// update profile
server.put('/profile', (req, res) => {
    const {
        idToken,
        salary
    } = req.body;
    //adds job ID to user favorites list in Mongo
    let newSalary = parseFloat(salary);
    console.log(newSalary);
    if (typeof newSalary != "number" && newSalary < 0) {
        res.send("Salary must be a number greater than 0");
        return;
    }
    if (newSalary) {
        try {
            mongo.userDb.updateUserProfile(idToken, { "desiredsalary": newSalary });
            res.send(JSON.stringify({
                'status': 'success'
            }));

        } catch (err) {
            console.log(err);
            res.sendStatus(400);
        }
    } else {
        res.sendStatus(400);
    }
});

server.put('/favorite', (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            mongo.userDb.updateUserProfileArray(idToken, { "favorites": jobId });
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
            mongo.userDb.updateUserProfileArray(idToken, { "applied": applyObj });
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
            mongo.userDb.updateUserProfileArray(idToken, { "ignored": jobId });
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