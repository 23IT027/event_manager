const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const auth = require('../middleware/auth');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../db.env') });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    console.log('Upload directory:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif').split(',');
  console.log('File type:', file.mimetype);
  console.log('Allowed types:', allowedTypes);
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log('Invalid file type:', file.mimetype);
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

const { createEvent, getEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');

// Debug route to list all events
router.get('/debug/all', async (req, res) => {
  try {
    const db = getDB();
    console.log('Debug: Fetching all events from database');
    const events = await db.collection('events').find({}).toArray();
    console.log('Debug: Found events:', events);
    res.json(events);
  } catch (error) {
    console.error('Debug: Error fetching events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all events with search
router.get('/', async (req, res) => {
  try {
    const { search, type } = req.query;
    const db = getDB();
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (type) {
      query.type = type;
    }

    const events = await db.collection('events')
      .find(query)
      .project({ title: 1, description: 1, date: 1, type: 1, image: 1 })
      .sort({ date: -1 })
      .toArray();

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const event = await db.collection('events').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create event
router.post('/', auth, upload.single('image'), (req, res, next) => {
  console.log('Received event creation request');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  console.log('User ID:', req.user.userId);
  next();
}, createEvent);

// Update event
router.put('/:id', auth, upload.single('image'), updateEvent);

// Delete event
router.delete('/:id', auth, deleteEvent);

module.exports = router; 