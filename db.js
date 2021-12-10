const dotenv = require('dotenv').config();
const { MongoClient } = require('mongodb');
const connectionString = process.env.MONGO_CONNECTION_STRING;
const client = new MongoClient(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
const jobsCollection = client.db('NOBSJOBS').collection('jobs');

function initialize() {
    client.connect(err => {
        if (err) return console.error(err);
    })
};

function addData(req) {

    jobsCollection.insertOne(req.body)
        .then(result => {
            console.log(result);
        })
        .catch(error => console.error(error))
}

async function addData2(req) {
    const result = await jobsCollection.insertOne(req.body);
    console.log(result);
}

function deleteJob(req) {

    jobsCollection.deleteOne(req.id)
        .then(result => {
            console.log(result);
        })
        .catch(error => console.error(error))
}
module.exports = { initialize, addData, deleteJob };