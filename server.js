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
            console.log(idToken);
            const results = await mongo.userDb.getUserProfile(idToken);
            console.log("results: " + results[0].favorites);
            if (results) {
                let favoriteResults = results[0].favorites.map(async element => {
                    return mongo.jobDb.readJobListing({ "_id": mongo.ObjectId(element) })
                });
                const resolvedFaves = await Promise.all(favoriteResults);
                let finalResult = [];
                resolvedFaves.map(favArr => {
                    finalResult.push(...favArr)
                })
                return res.send(finalResult);

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
    //returns all jobs by search term or if empty, returns all jobs. Will not return jobs that are ignored!
    const { location, title, jobId } = req.body;
    let search;
    if (location && title) {
        search = {
            "$and": [
                { location },
                { title }
            ]
        }
    } else if (jobId) {
        search = { "_id": mongo.ObjectId(jobId) }
    } else if (location && !title) {
        search = { location: location }

    } else if (!location && title) {
        search = { title: title }
    }
    try {
        console.log(search);
        let results = await mongo.jobDb.readJobListing(search);
        return res.send(results);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
});


server.post('/create-job', firebaseMiddleware, async (req, res) => {
    try {
        console.log(req.body);
        const { title, companyname, type, benefits, salary, qualifications, description, location } = req.body;
        const vars = [title, companyname, type, benefits, salary, qualifications, description, location];

        for (let i = 0; i < vars.length; i++) {
            let val = vars[i];
            if (val === undefined) {
                console.log(`Variable ${i} was undefined`);
                res.status(400);
            }
        }

        const newSalary = parseFloat(salary);
        const newJob = {
            title,
            companyname,
            type,
            benefits,
            salary,
            qualifications,
            description,
            location
        }

        await mongo.jobDb.addJobListing(newJob);
        //creates job based on form inputs post validation
        res.send(JSON.stringify({ "status": "success" }));
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

/*
 *
 * USER COLLECTION ROUTES
 *
 */

server.post('/create-user', firebaseMiddleware, async (req, res) => {
    try {
        const { idToken } = req.body;

        // First check if the user exists
        let existingUser = await mongo.userDb.getUserProfile(idToken);
        if (existingUser.length > 0) {
            console.log('User exists already - avoiding duplicate insertion')
            return;
        } else {
            console.log('THe user did not exist')
        }

        const userObj = {
            ignored: [],
            favorites: [],
            applied: [],
            desiredsalary: 50000,
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