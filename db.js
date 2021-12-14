const {
    MongoClient
} = require('mongodb');
const connectionString = process.env.MONGO_CONNECTION_STRING;
const client = new MongoClient(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const jobsCollection = client.db('NOBSJOBS').collection('jobs');
const userCollecton = client.db('NOBSJOBS').collection('users');

const jobDb = {

    addJobListing: (newJob) => {
        client.connect(async err => {
            if (err) return console.log(err);
            console.log('connected to db user collection');
            try {
                if (newJob.length > 0) {
                    let result = await jobsCollection.insertOne(newJob);
                    console.log(result);
                }
            } catch (error) {
                throw new Error(error);
            } finally {
                client.close();
                console.log('closed db connection');
            }
        });
    },

    readJobListing: (req) => {
        //returns all jobs in the collection if req is empty
        client.connect(async err => {
            if (err) return console.log(err);
            console.log('connected to db user collection');
            try {
                console.log(req.body);
                if (!Object.keys(req.body).length) {
                    console.log('empty body request')
                    let result = await jobsCollection.find().toArray();
                    console.log(result);
                    return result;
                } else {
                    console.log('full body request')
                    let result = await jobsCollection.find(req.body).toArray();
                    return result;
                }
            } catch (error) {
                throw new Error(error);
            } finally {
                client.close();
                console.log('closed db connection');
            }
        });

    },

    deleteJobListing: (jobId) => {
        client.connect(async err => {
            if (err) return console.log(err);
            console.log('connected to db user collection');
            try {
                let result = await jobsCollection.deleteOne(jobId);
                return result;
            } catch (error) {
                throw new Error(error);
            } finally {
                client.close();
                console.log('closed db connection');
            }
        });
    }
}

const userDb = {

    addUserProfile: user => {
        client.connect(async err => {
            if (err) return console.log(err);
            console.log('connected to db user collection');
            try {
                let result = await userCollecton.insertOne(user).toArray();
                return result;
            } catch (error) {
                throw new Error(error);
            } finally {
                client.close();
                console.log('closed db connection');
            }
        });
    },

    getUserProfile: user => {
        client.connect(async err => {
            if (err) return console.log(err);
            console.log('connected to db user collection');
            try {
                let result = await userCollecton.find({
                    idToken: user
                }).toArray();
                return result;
            } catch (error) {
                throw new Error(error);
            } finally {
                client.close();
                console.log('closed db connection');
            }
        })
    },

    updateUserProfile: user => {
        client.connect(async err => {
            if (err) return console.log(err);
            console.log('connected to db user collection');
            try {
                let result = await userCollecton.updateOne(
                    //filter
                    { idToken: user.idToken },
                    //update
                    {
                        $push: {...payload }
                    });
                return result;
            } catch (error) {
                throw new Error(error);
            } finally {
                client.close();
                console.log('closed db connection');
            }
        })
    },

    deleteUserDataFromCollection: (idToken, data) => {
        client.connect(async err => {
            if (err) return console.log(err);
            console.log('connected to db user collection');
            try {
                let result = await jobsCollection.updateOne({ idToken }, { $pull: { favorites: { jobId } } });
                return result;
            } catch (error) {
                throw new Error(error);
            } finally {
                client.close();
                console.log('closed db connection');
            }
        });
    },

    deleteUserProfile: user => {
        client.connect(async err => {
            if (err) return console.log(err);
            console.log('connected to db user collection');
            try {
                let result = await userCollecton.deleteOne({
                    idToken: user
                }).toArray();
                return result;
            } catch (error) {
                throw new Error(error);
            } finally {
                client.close();
                console.log('closed db connection');
            }
        })
    }

}


module.exports = {
    jobDb,
    userDb
};