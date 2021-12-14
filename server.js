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
server.set('view engine', 'ejs');

/*
 *
 * FIREBASE MIDDLEWARE
 *
 */


const firebaseMiddleware = async (req, res, next) => {
    try {
        const idToken = req.headers['authorization'].split(" ")[1];
        const verifiedToken = await firebase.auth().verifyIdToken(idToken.toString());
        req.body.idToken = verifiedToken.uid;
        next();
        console.log('Performed middleware');
    } catch (e) {
        console.log('Middleware failed: ' + e);
        res.status(500).send('unable to verify user (because of Michael and Zach)');
    }
}

// server.use(skipAuth('/find-jobs'));
mongo.connection.connect();
/*
 *
 * JOB COLLECTION ROUTES
 *
 */

server.get('/favorites', firebaseMiddleware, async (req, res) => {
    const { idToken } = req.body;
    if (idToken) {
        try {
            const result = (await mongo.userDb.getUserProfile(idToken)).toArray;
            console.log(result);
            if (result) {
                const favoritesResults = mongo.jobDb.readJobListing({ "$and": [result] });
                res.send('got favorites');
                return favoritesResults;
            } else {
                res.sendStatus(500);
            }
        } catch (err) {
            res.sendStatus(500);
            console.error(err);
        }
    } else {
        res.sendStatus(400);
    }
});


server.post('/find-jobs', async (req, res) => {
    try {
        let { location, title } = req.body;
        let results;
        if (location && title) {
            console.log('Searching with keywords');
            const search = {
                "$and": [
                    { location },
                    { title }
                ]
            }
            results = await mongo.jobDb.readJobListing(search);
        } else {
            console.log('Searching without keywords');
            results = await mongo.jobDb.readJobListing();
        }
        res.send(results);
    } catch (e) {
        console.log('Error in /find-jobs: ' + e);
        res.sendStatus(500);
    }
});



server.post('/create-job', firebaseMiddleware, async (req, res) => {
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
        await mongo.jobDb.addJobListing(newJob);
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

server.post('/create-user', firebaseMiddleware, async (req, res) => {
    try {
        const {
            idToken,
            salary
        } = req.body;
        let newSalary = parseFloat(salary);
        if (typeof newSalary != "number" && newSalary < 0) {
            res.send("Salary must be a number greater than 0.")
            return;
        }

        // First check if the user exists
        let existingUser = await mongo.userDb.getUserProfile(idToken);
        if (existingUser) {
            console.log('User exists already - avoiding duplicate insertion')
            return;
        } else {
            console.log('THe user did not exist')
        }

        console.log("/create user function");
        const userObj = {
            ignored: [],
            favorites: [],
            applied: [],
            desiredsalary: newSalary,
            idToken: idToken
        }

        let result = await mongo.userDb.addUserProfile(userObj);
        console.log(result);
        res.sendStatus(200);


    } catch (e) {
        console.log('An error occurred in /create-user' + e);
        res.sendStatus(500);
    }
});

server.delete('/favorite', firebaseMiddleware, async (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    console.log("req.body is parsed");
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            await mongo.userDb.deleteUserDataFromCollection(idToken, { "favorites": jobId });
            res.send('jobs gone from favorites');

        } catch (err) {
            console.log(err);
        }
    } else {
        res.sendStatus(400);
    }
});

server.delete('/ignore', firebaseMiddleware, async (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            await mongo.userDb.deleteUserDataFromCollection(idToken, { "ignored": jobId });
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
//added some crap
server.put('/profile', firebaseMiddleware, async (req, res) => {
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
            await mongo.userDb.updateUserProfile(idToken, { "desiredsalary": newSalary });
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

server.put('/favorite', firebaseMiddleware, async (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            await mongo.userDb.updateUserProfileArray(idToken, { "favorites": jobId });
            //adds job ID to user favorites list in Mongo
            res.send('jobs replaced');

        } catch (err) {
            console.log(err);
        }
    } else {
        res.sendStatus(400);
    }
});

server.put('/apply', firebaseMiddleware, async (req, res) => {
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
            await mongo.userDb.updateUserProfileArray(idToken, { "applied": applyObj });
            //adds job ID to user favorites list in Mongo
            res.send('applied to ' + jobId + ' on ' + applyObj.dateAdded);

        } catch (err) {
            console.log(err);
        }
    } else {
        res.sendStatus(400);
    }
});

server.put('/ignore', firebaseMiddleware, async (req, res) => {
    const {
        idToken,
        jobId
    } = req.body;
    //adds job ID to user favorites list in Mongo
    if (jobId) {
        try {
            await mongo.userDb.updateUserProfileArray(idToken, { "ignored": jobId });
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