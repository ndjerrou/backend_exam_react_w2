const express = require('express');
const mongoose = require('mongoose');
const Joi = require('joi');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken')

// MongoDB connection setup (replace 'your_mongodb_url' and 'your_mongodb_credentials' with your actual values)
const mongoURL =
  'mongodb+srv://ndjerrou:ndjerrou@db.tounu.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(`${mongoURL}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Placeholder for token validation (replace with actual authentication logic)
const authenticateToken = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token)
    return res
      .status(401)
      .json({ error: 'Access denied. Token not provided.' });

  // Add your token validation logic here (e.g., verify JWT)
  // For simplicity, we're assuming any non-empty token is valid in this example
  next();
};

// Define user and product schemas
const userSchema = new mongoose.Schema({
  nom: String,
  prenom: String,
  age: Number,
  address: {
    ville: String,
    postalCode: String,
    numeroRue: String,
    nomRue: String,
  },
});

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  stock: {
    type: Number,
    validate: {
      validator: value => value >= 0,
      message: 'Stock must be a non-negative number.',
    },
  },
  brand: String,
  color: String,
  desc: String,
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

app.use(express.json());

// Joi validation schema for product creation
const productCreationSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required(),
  stock: Joi.number().min(0).required(),
  brand: Joi.string().required(),
  color: Joi.string().required(),
  desc: Joi.string().required(),
});

// User endpoints
app.post('/api/signup', async (req, res) => {
  const userData = req.body;

  // Validate incoming data using Joi schema
  const userValidationSchema = Joi.object({
    nom: Joi.string().required(),
    prenom: Joi.string().required(),
    age: Joi.number().required(),
    address: Joi.object({
      ville: Joi.string().required(),
      postalCode: Joi.string().required(),
      numeroRue: Joi.string().required(),
      nomRue: Joi.string().required(),
    }).required(),
  });

  const { error } = userValidationSchema.validate(userData);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const newUser = await User.create(userData);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

app.post('/api/login', (req, res) => {
  // Placeholder for login logic (replace with actual authentication logic)
  // For simplicity, we're assuming successful login and returning a token
  const token = ;
  res.json({ token });
});

// Apply authentication middleware only to create a product (admin action)
app.post('/api/product', authenticateToken, async (req, res) => {
  const productData = req.body;

  // Validate incoming data using Joi schema
  const { error } = productCreationSchema.validate(productData);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const newProduct = await Product.create(productData);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: 'Invalid product data' });
  }
});

// Other product endpoints (GET, PUT, DELETE)...

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
