const express = require('express');
const Message = require('../models/messages');
const router = express.Router();

// GET messages by group ID
router.get('/messages/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ groupId }).sort({ timeSent: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
