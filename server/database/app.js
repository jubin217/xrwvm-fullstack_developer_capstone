const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3030;

app.use(cors());
app.use(require('body-parser').urlencoded({ extended: false }));

const reviews_data = JSON.parse(fs.readFileSync("reviews.json", 'utf8'));
const dealerships_data = JSON.parse(fs.readFileSync("dealerships.json", 'utf8'));

const Reviews = require('./review');
const Dealerships = require('./dealership');

let useLocalData = true;

mongoose.connect("mongodb://mongo_db:27017/", { 'dbName': 'dealershipsDB', 'serverSelectionTimeoutMS': 1000 })
  .then(() => {
    console.log("Connected to MongoDB");
    useLocalData = false;
    try {
      Reviews.deleteMany({}).then(() => {
        Reviews.insertMany(reviews_data['reviews']);
      });
      Dealerships.deleteMany({}).then(() => {
        Dealerships.insertMany(dealerships_data['dealerships']);
      });
    } catch (error) {
      console.error("Error populating database:", error);
    }
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB, using local JSON files fallback:", err.message);
  });

// Express route to home
app.get('/', async (req, res) => {
  res.send("Welcome to the Mongoose API");
});

// Express route to fetch all reviews
app.get('/fetchReviews', async (req, res) => {
  if (useLocalData) {
    return res.json(reviews_data['reviews']);
  }
  try {
    const documents = await Reviews.find();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch reviews by a particular dealer
app.get('/fetchReviews/dealer/:id', async (req, res) => {
  if (useLocalData) {
    const documents = reviews_data['reviews'].filter(r => r.dealership == req.params.id);
    return res.json(documents);
  }
  try {
    const documents = await Reviews.find({ dealership: req.params.id });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch all dealerships
app.get('/fetchDealers', async (req, res) => {
  if (useLocalData) {
    return res.json(dealerships_data['dealerships']);
  }
  try {
    const documents = await Dealerships.find();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dealerships' });
  }
});

// Express route to fetch Dealers by a particular state
app.get('/fetchDealers/:state', async (req, res) => {
  if (useLocalData) {
    const documents = dealerships_data['dealerships'].filter(d => d.state === req.params.state);
    return res.json(documents);
  }
  try {
    const documents = await Dealerships.find({ state: req.params.state });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dealerships by state' });
  }
});

// Express route to fetch dealer by a particular id
app.get('/fetchDealer/:id', async (req, res) => {
  if (useLocalData) {
    const document = dealerships_data['dealerships'].find(d => d.id == req.params.id);
    return res.json(document || {});
  }
  try {
    const document = await Dealerships.findOne({ id: req.params.id });
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dealership by id' });
  }
});

// Express route to insert review
app.post('/insert_review', express.raw({ type: '*/*' }), async (req, res) => {
  const data = JSON.parse(req.body);
  if (useLocalData) {
    const sorted = [...reviews_data['reviews']].sort((a, b) => b.id - a.id);
    const new_id = sorted[0] ? sorted[0].id + 1 : 1;
    const review = {
      "id": new_id,
      "name": data.name,
      "dealership": data.dealership,
      "review": data.review,
      "purchase": data.purchase,
      "purchase_date": data.purchase_date,
      "car_make": data.car_make,
      "car_model": data.car_model,
      "car_year": data.car_year,
    };
    reviews_data['reviews'].push(review);
    return res.json(review);
  }
  const documents = await Reviews.find().sort({ id: -1 });
  let new_id = documents[0]['id'] + 1;

  const review = new Reviews({
    "id": new_id,
    "name": data['name'],
    "dealership": data['dealership'],
    "review": data['review'],
    "purchase": data['purchase'],
    "purchase_date": data['purchase_date'],
    "car_make": data['car_make'],
    "car_model": data['car_model'],
    "car_year": data['car_year'],
  });

  try {
    const savedReview = await review.save();
    res.json(savedReview);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error inserting review' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

