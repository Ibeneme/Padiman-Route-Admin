const express = require("express");
const MainMessage = require("../../models/messaging");

const router = express.Router();

// ---------------------- Delete all main messages --------------------------------

router.delete("/", async (req, res) => {
  try {
    await MainMessage.deleteMany({});
    res.status(200).json({ message: "All main messages have been deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------- Create a Message group --------------------------------

//#################
// Message Groups are just like what'app group,
// or Teleegram's channels just that they enable
// two people converstaions also so a user to user
//messaging feasture is built on this
//#################

router.post("/create", async (req, res) => {
  try {
    const { userIds } = req.body;

    // Check if userIds are provided and non-empty
    if (!userIds || !userIds.length) {
      return res.status(400).json({ error: "userIds are required" });
    }

    // Check for duplicate userIds
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length !== userIds.length) {
      return res
        .status(400)
        .json({ error: "Duplicate userIds are not allowed" });
    }

    // Find existing message with exact matching userIds
    const existingMessage = await MainMessage.findOne({
      userIds: { $all: userIds, $size: userIds.length },
    });

    if (existingMessage) {
      return res.status(200).json({ mainMessageId: existingMessage._id });
    }

    // Create new message if no existing message found
    const newMessage = new MainMessage({
      userIds,
      name,
      description,
      imageUrl,
      createdBy: createdBy || userIds[0], // Default createdBy to the first userId if not provided
      timeCreated: Date.now(),
    });

    await newMessage.save();
    res.status(201).json({ mainMessageId: newMessage._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const mainMessages = await MainMessage.find({});

    res.status(200).json(mainMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const mainMessage = await MainMessage.findById(id);

    if (!mainMessage) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.status(200).json(mainMessage);
    console.log(mainMessage, "mainMessage");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------- Create a Message in a Message Group --------------------------------

//#################
// Sending and receiving messages
//#################

router.post("/main/:mainMessageId/", async (req, res) => {
  try {
    const { mainMessageId } = req.params;
    const { userId, translations, reactions, replies, message, timeSent } =
      req.body;

    const mainMessage = await MainMessage.findById(mainMessageId);

    if (!mainMessage) {
      return res.status(404).json({ error: "Main message not found" });
    }

    const newMessage = {
      userId,
      translations,
      reactions,
      replies,
      message,
      timeSent: timeSent || Date.now(), // Default timeSent to current time if not provided
    };

    mainMessage.messages.push(newMessage);
    await mainMessage.save();

    res.status(201).json(mainMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/main/:mainMessageId/:messageId", async (req, res) => {
  try {
    const { mainMessageId, messageId } = req.params;
    const { userId, translations, reactions, replies, message, timeSent } =
      req.body;

    const mainMessage = await MainMessage.findById(mainMessageId);

    if (!mainMessage) {
      return res.status(404).json({ error: "Main message not found" });
    }

    const messageToUpdate = mainMessage.messages.find(
      (msg) => msg._id.toString() === messageId
    );

    if (!messageToUpdate) {
      return res.status(404).json({ error: "Message not found" });
    }

    messageToUpdate.userId = userId || messageToUpdate.userId;
    messageToUpdate.translations = translations || messageToUpdate.translations;
    messageToUpdate.reactions = reactions || messageToUpdate.reactions;
    messageToUpdate.replies = replies || messageToUpdate.replies;
    messageToUpdate.message = message || messageToUpdate.message;
    messageToUpdate.timeSent = timeSent || messageToUpdate.timeSent;

    await mainMessage.save();

    res.status(200).json(mainMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//#################
// Reacting to Messages
//#################

router.post(
  "/main/:mainMessageId/messages/:messageId/reactions",
  async (req, res) => {
    try {
      const { mainMessageId, messageId } = req.params;
      const { reaction, userId, timeReacted } = req.body;

      const mainMessage = await MainMessage.findById(mainMessageId);
      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const messageToUpdate = mainMessage.messages.find(
        (msg) => msg._id.toString() === messageId
      );

      if (!messageToUpdate) {
        return res.status(404).json({ error: "Message not found" });
      }
      const existingReaction = messageToUpdate.reactions.find(
        (r) => r.userId.toString() === userId
      );
      if (existingReaction) {
        existingReaction.reaction = reaction;
        existingReaction.timeReacted = timeReacted;
      } else {
        messageToUpdate.reactions.push({ reaction, userId, timeReacted });
      }
      await mainMessage.save();
      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/main/:mainMessageId/messages/:messageId/reactions/:reactionId",
  async (req, res) => {
    try {
      const {
        reaction,
        userId,
        timeReacted,
        // mainMessageId,
        // messageId,
        //reactionId,
      } = req.body;
      const { mainMessageId, reactionId, messageId } = req.params;
      const mainMessage = await MainMessage.findOne({ _id: mainMessageId });
      //console.log(mainMessage, "mainMessage");
      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const messageToUpdate = mainMessage.messages.find((msg) => {
        return msg._id.toString() === messageId; // Return the result of the comparison
      });

      if (!messageToUpdate) {
        return res.status(404).json({ error: "Message not found" });
      }

      const reactionToUpdate = messageToUpdate.reactions.find(
        (react) => react._id.toString() === reactionId
      );
      console.log(reactionToUpdate, "reactionToUpdate");
      if (!reactionToUpdate) {
        return res.status(404).json({ error: "Reaction not found" });
      }

      // Update the reaction fields with the provided data from the request body
      reactionToUpdate.reaction = reaction || reactionToUpdate.reaction;
      reactionToUpdate.userId = userId || reactionToUpdate.userId;
      reactionToUpdate.timeReacted =
        timeReacted || reactionToUpdate.timeReacted;

      // Mark the 'messages' array as modified since it's a nested array
      mainMessage.markModified("messages");
      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
router.delete(
  "/main/:mainMessageId/messages/:messageId/reactions/:reactionId",
  async (req, res) => {
    try {
      const { mainMessageId, messageId, reactionId } = req.params;

      const mainMessage = await MainMessage.findById(mainMessageId);
      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const messageToUpdate = mainMessage.messages.find(
        (msg) => msg._id.toString() === messageId
      );
      if (!messageToUpdate) {
        return res.status(404).json({ error: "Message not found" });
      }

      const reactionToRemoveIndex = messageToUpdate.reactions.findIndex(
        (react) => react._id.toString() === reactionId
      );
      if (reactionToRemoveIndex === -1) {
        return res.status(404).json({ error: "Reaction not found" });
      }

      // Remove the reaction from the reactions array
      messageToUpdate.reactions.splice(reactionToRemoveIndex, 1);

      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

//#################
// Replying to Messages
//#################

router.post(
  "/main/:mainMessageId/messages/:messageId/replies",
  async (req, res) => {
    try {
      const { mainMessageId, messageId } = req.params;
      const { translations, reactions, repliedBy, message, timeSent } =
        req.body;

      const mainMessage = await MainMessage.findById(mainMessageId);
      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const messageToUpdate = mainMessage.messages.find(
        (msg) => msg._id.toString() === messageId
      );
      if (!messageToUpdate) {
        return res.status(404).json({ error: "Message not found" });
      }

      const newReply = {
        translations,
        reactions,
        repliedBy,
        message, // Include the message field
        timeSent, // Include the timeSent field
      };
      console.log(newReply, "newReply");
      messageToUpdate.replies.push(newReply);

      await mainMessage.save();

      res.status(201).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/main/:mainMessageId/messages/:messageId/replies/:replyId",
  async (req, res) => {
    try {
      const { mainMessageId, messageId, replyId } = req.params;
      const updateData = req.body;

      const mainMessage = await MainMessage.findById(mainMessageId);
      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const messageToUpdate = mainMessage.messages.find(
        (msg) => msg._id.toString() === messageId
      );
      if (!messageToUpdate) {
        return res.status(404).json({ error: "Message not found" });
      }

      const replyToUpdate = messageToUpdate.replies.find(
        (reply) => reply._id.toString() === replyId
      );
      if (!replyToUpdate) {
        return res.status(404).json({ error: "Reply not found" });
      }

      Object.assign(replyToUpdate, updateData);

      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete(
  "/main/:mainMessageId/messages/:messageId/replies/:replyId",
  async (req, res) => {
    try {
      const { mainMessageId, messageId, replyId } = req.params;

      const mainMessage = await MainMessage.findById(mainMessageId);
      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const messageToUpdate = mainMessage.messages.find(
        (msg) => msg._id.toString() === messageId
      );
      if (!messageToUpdate) {
        return res.status(404).json({ error: "Message not found" });
      }

      const replyToRemoveIndex = messageToUpdate.replies.findIndex(
        (reply) => reply._id.toString() === replyId
      );
      if (replyToRemoveIndex === -1) {
        return res.status(404).json({ error: "Reply not found" });
      }

      // Remove the reply from the replies array
      messageToUpdate.replies.splice(replyToRemoveIndex, 1);

      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

//#################
// Reacting to Replied Messages
//#################
router.post(
  "/main/:mainMessageId/message/:messageId/reply/:replyId/react",
  async (req, res) => {
    try {
      const { mainMessageId, messageId, replyId } = req.params;
      const { reaction, userId, timeReacted } = req.body;

      const mainMessage = await MainMessage.findById(mainMessageId);

      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const message = mainMessage.messages.find(
        (msg) => msg._id.toString() === messageId
      );

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const repliedMessage = message.replies.find(
        (reply) => reply._id.toString() === replyId
      );

      if (!repliedMessage) {
        return res.status(404).json({ error: "Replied message not found" });
      }

      // Add reaction to the replied message
      repliedMessage.reactions.push({
        reaction,
        userId,
        timeReacted: timeReacted || Date.now(),
      });

      await mainMessage.save();

      res.status(201).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/main/:mainMessageId/message/:messageId/reply/:replyId/react/:reactionId",
  async (req, res) => {
    try {
      const { mainMessageId, messageId, replyId, reactionId } = req.params;
      const { reaction, userId, timeReacted } = req.body;

      const mainMessage = await MainMessage.findById(mainMessageId);

      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const message = mainMessage.messages.find(
        (msg) => msg._id.toString() === messageId
      );

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const repliedMessage = message.replies.find(
        (reply) => reply._id.toString() === replyId
      );

      if (!repliedMessage) {
        return res.status(404).json({ error: "Replied message not found" });
      }

      const reactionToUpdate = repliedMessage.reactions.find(
        (react) => react._id.toString() === reactionId
      );

      if (!reactionToUpdate) {
        return res.status(404).json({ error: "Reaction not found" });
      }

      // Update the reaction fields with the provided data from the request body
      reactionToUpdate.reaction = reaction || reactionToUpdate.reaction;
      reactionToUpdate.userId = userId || reactionToUpdate.userId;
      reactionToUpdate.timeReacted =
        timeReacted || reactionToUpdate.timeReacted;

      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete(
  "/main/:mainMessageId/message/:messageId/reply/:replyId/react/:reactionId",
  async (req, res) => {
    try {
      const { mainMessageId, messageId, replyId, reactionId } = req.params;

      const mainMessage = await MainMessage.findById(mainMessageId);

      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const message = mainMessage.messages.find(
        (msg) => msg._id.toString() === messageId
      );

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const repliedMessage = message.replies.find(
        (reply) => reply._id.toString() === replyId
      );

      if (!repliedMessage) {
        return res.status(404).json({ error: "Replied message not found" });
      }

      const reactionIndex = repliedMessage.reactions.findIndex(
        (react) => react._id.toString() === reactionId
      );

      if (reactionIndex === -1) {
        return res.status(404).json({ error: "Reaction not found" });
      }

      // Remove the reaction from the replied message
      repliedMessage.reactions.splice(reactionIndex, 1);

      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

//#################
// Delivering and reading Messages
//#################

router.put(
  "/main/:mainMessageId/message/:messageId/delivered",
  async (req, res) => {
    try {
      const { mainMessageId, messageId } = req.params;
      const { userId } = req.body;

      const mainMessage = await MainMessage.findById(mainMessageId);

      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const message = mainMessage.messages.id(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Update isDelivered status for the specific user
      const deliveryStatus = message.isDelivered.find(
        (status) => status.userId.toString() === userId
      );
      if (deliveryStatus) {
        deliveryStatus.status = true;
      } else {
        message.isDelivered.push({ userId, status: true });
      }

      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put("/main/:mainMessageId/message/:messageId/read", async (req, res) => {
  try {
    const { mainMessageId, messageId } = req.params;
    const { userId } = req.body;

    const mainMessage = await MainMessage.findById(mainMessageId);

    if (!mainMessage) {
      return res.status(404).json({ error: "Main message not found" });
    }

    const message = mainMessage.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Update isDelivered status for the specific user
    const readStatus = message.isRead.find(
      (status) => status.userId.toString() === userId
    );
    if (readStatus) {
      readStatus.status = true;
    } else {
      message.isRead.push({ userId, status: true });
    }

    await mainMessage.save();

    res.status(200).json(mainMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//#################
// Delivering and reading Replies
//#################

// Route to update isDelivered status of a reply
router.put(
  "/main/:mainMessageId/message/:messageId/reply/:replyId/delivered",
  async (req, res) => {
    try {
      const { mainMessageId, messageId, replyId } = req.params;
      const { userId } = req.body;

      const mainMessage = await MainMessage.findById(mainMessageId);

      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const message = mainMessage.messages.id(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const reply = message.replies.id(replyId);
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      // Update isDelivered status for the specific user
      const deliveryStatus = reply.isDelivered.find(
        (status) => status.userId.toString() === userId
      );
      if (deliveryStatus) {
        deliveryStatus.status = true;
      } else {
        reply.isDelivered.push({ userId, status: true });
      }

      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Route to update isRead status of a reply
router.put(
  "/main/:mainMessageId/message/:messageId/reply/:replyId/read",
  async (req, res) => {
    try {
      const { mainMessageId, messageId, replyId } = req.params;
      const { userId } = req.body;

      const mainMessage = await MainMessage.findById(mainMessageId);

      if (!mainMessage) {
        return res.status(404).json({ error: "Main message not found" });
      }

      const message = mainMessage.messages.id(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const reply = message.replies.id(replyId);
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      // Update isRead status for the specific user
      const readStatus = reply.isRead.find(
        (status) => status.userId.toString() === userId
      );
      if (readStatus) {
        readStatus.status = true;
      } else {
        reply.isRead.push({ userId, status: true });
      }

      await mainMessage.save();

      res.status(200).json(mainMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
