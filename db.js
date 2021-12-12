const dotenv = require('dotenv').config();
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

    addJobListing: async (req) => {
        try {
            if (Object.keys(req.body).length) {
                let result = await jobsCollection.insertOne(req.body);
                console.log(result);
            }
        } catch (error) {
            console.log(error);
        }
    },

    readJobListing: async (req) => {
        //returns all jobs in the collection if req is empty
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
            console.log(error);
        }

    },

    deleteJobListing: async (req) => {
        try {
            let result = await jobsCollection.deleteOne(req.id);
            return result;
        } catch (error) {
            console.log(error)
        }
    }
}

const userDb = {

    addUserProfile: async user => {
        client.connect(err => {
            if (err) return console.log(err);
            try {
                let result = await userCollecton.insertOne(user);
                return result;
            } catch (error) {
                console.log(error);
            } finally {
                client.close()
            }
        });
    },

    getUserProfile: async user => {
        client.connect(err => {
            if (err) return console.log(err);
            try {
                let result = await userCollecton.find({
                    userId: user
                }).toArray();
                return result;
            } catch (error) {
                console.log(error);
            } finally {
                client.close()
            }
        })
    },

    updateUserProfile: async user => {
        client.connect(err => {
            if (err) return console.log(err);
            try {
                let result = await userCollecton.insertOne({
                    userId: user
                }).toArray();
                return result;
            } catch (error) {
                console.log(error);
            } finally {
                client.close()
            }
        })
    },

    deleteUserProfile: async user => {
        client.connect(err => {
            if (err) return console.log(err);
            try {
                let result = await userCollecton.deleteOne({
                    userId: user
                }).toArray();
                return result;
            } catch (error) {
                console.log(error);
            } finally {
                client.close()
            }
        })
    }

}


module.exports = {
    initialize,
    jobDb,
    userDb
};