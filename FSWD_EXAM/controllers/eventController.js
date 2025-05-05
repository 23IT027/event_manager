const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const createEvent = async (req, res) => {
  try {
    console.log('Received event creation request:', req.body);
    const { title, description, date, location, type } = req.body;
    const db = getDB();

    // Validate required fields
    if (!title || !description || !date || !location || !type) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        received: { title, description, date, location, type }
      });
    }

    // Log the database connection status
    console.log('Database connection status:', db ? 'Connected' : 'Not connected');

    const eventData = {
      title,
      description,
      date: new Date(date),
      location,
      type,
      image: req.file ? req.file.filename : null,
      createdBy: new ObjectId(req.user.userId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Attempting to insert event:', eventData);

    // Verify the events collection exists
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    const result = await db.collection('events').insertOne(eventData);
    console.log('Insert result:', result);

    if (!result.insertedId) {
      throw new Error('Failed to insert event into database');
    }

    // Verify the event was inserted
    const insertedEvent = await db.collection('events').findOne({ _id: result.insertedId });
    console.log('Verified inserted event:', insertedEvent);

    res.status(201).json({
      id: result.insertedId,
      title,
      description,
      date,
      location,
      type,
      image: req.file ? req.file.filename : null
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};

const getEvents = async (req, res) => {
  try {
    const db = getDB();
    const events = await db.collection('events')
      .find()
      .sort({ date: 1 })
      .toArray();

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const event = await db.collection('events').findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, location } = req.body;
    const db = getDB();

    const event = await db.collection('events').findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator
    if (event.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updateData = {
      title,
      description,
      date: new Date(date),
      location,
      updatedAt: new Date()
    };

    if (req.file) {
      updateData.image = req.file.filename;
    }

    await db.collection('events').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.json({
      id,
      ...updateData
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const event = await db.collection('events').findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator
    if (event.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await db.collection('events').deleteOne({ _id: new ObjectId(id) });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent
}; 