const express = require('express');
const mongoose = require('mongoose');
const Joi = require('joi');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// MongoDB connection setup (replace 'your_mongodb_url' and 'your_mongodb_credentials' with your actual values)
const mongoURL = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_MDP}@db.tounu.mongodb.net/?retryWrites=true&w=majority`;
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

  try {
    const token = jwt.verify(token, process.env.SECRET_KEY);
    if (token.isAdmin) {
      next();
    }
  } catch (err) {
    return res.status(401).send({ ok: false, msg: 'Unauthorized action' });
  }
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
  email: { type: String, unique: true },
  password: {
    type: String,
    validate: {
      validator: pwd => pwd.length > 6,
      message: 'Password length must be > 6 characters',
    },
  },
  isAdmin: Boolean,
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

  let user = await User.findOne({ email: req.body.email });

  if (user)
    return res.status(400).send({ ok: false, msg: 'User already exists' });

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
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = userValidationSchema.validate(userData);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    user = await User.create({
      ...userData,
      password: await bcrypt.hash(req.body.password, 10),
    });
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);

    res.status(201).json({ token });
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

app.post('/api/login', async (req, res) => {
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
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = userValidationSchema.validate(userData);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const user = await User.findOne({ email: req.body.email });

  if (!user)
    return res.status(401).send({ ok: false, msg: 'Resource not found' });

  const isValid = await bcrypt.compare(req.body.password, user.password);

  if (!isValid) return res.status(400).send({ ok: false, msg: 'Bad request' });

  const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);

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

app.put('/api/product/:productId', async (req, res) => {
  const productData = req.body;

  // Validate incoming data using Joi schema
  const { error } = productCreationSchema.validate(productData);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.productId,
      productData,
      { new: true }
    );
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ error: 'Invalid product data' });
  }
});

app.delete('/api/product/:productId', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.productId);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.get('/api/product', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/product/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    res.json(product);
  } catch (error) {
    res.status(404).json({ error: 'Product not found' });
  }
});

// Other product endpoints (GET, PUT, DELETE)...

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
