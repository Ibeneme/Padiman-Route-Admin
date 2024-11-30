// // server.js

// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const mongoose = require("mongoose");
// const cors = require("cors");

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: "*",
//   },
// });

// // Connect to MongoDB using provided connection string
// mongoose.connect(
//   "mongodb+srv://ikennaibenemee:gt45CfCiuk3o9wN0@cluster0.rkncs8m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
//   { useNewUrlParser: true, useUnifiedTopology: true }
// );
// const db = mongoose.connection;

// db.on("error", console.error.bind(console, "MongoDB connection error:"));

// // Define User Schema and Model
// const userSchema = new mongoose.Schema({
//   email: { type: String, unique: true },
//   socketId: String,
// });

// const User = mongoose.model("User", userSchema);

// // Express middleware
// app.use(cors());

// // Express routes
// app.get("/", (req, res) => {
//   res.send("Chat App Server is running");
// });

// // Socket.io logic
// io.on("connection", (socket) => {
//   console.log("A user connected");

//   socket.on("disconnect", async () => {
//     console.log("User disconnected");
//     // try {
//     //   await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
//     // } catch (err) {
//     //   console.error(err);
//     // }
//   });

//   // Handle user authentication
//   // Handle user authentication
//   // Handle user authentication
//   // Handle user authentication
//   // socket.on("authenticate", (email) => {
//   //   User.findOne({ email })
//   //     .exec()
//   //     .then((user) => {
//   //       if (!user) {
//   //         // User not found, create new user
//   //         return User.create({ email, socketId: socket.id });
//   //       } else {
//   //         // User found, update socketId
//   //         user.socketId = socket.id;
//   //         return user.save();
//   //       }
//   //     })
//   //     .then((user) => {
//   //       console.log(`User authenticated: ${email}`);
//   //     })
//   //     .catch((err) => {
//   //       console.error(err);
//   //     });
//   // });

//   // Handle private messages
//   // Handle private messages
// //   socket.on("private_message", async ({ recipientId, message }) => {
// //     try {
// //       const recipient = await User.findOne({ _id: recipientId });
// //       if (recipient && recipient.socketId) {
// //         io.to(recipient.socketId).emit("private_message", { message });
// //       } else {
// //         console.log(`Recipient not found or offline`);
// //         // Handle offline recipient case
// //       }
// //     } catch (err) {
// //       console.error(err);
// //     }
// //   });
// // });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });


io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
  
    socket.on("joinGroup", ({ groupId }) => {
      socket.join(groupId);
      console.log(`Socket ${socket.id} joined group ${groupId}`);
    });
  
    socket.on("sendMessage", async ({ groupId, message, userId }) => {
      try {
        console.log(groupId, message, userId, "groupId, message, userId");
        // Find or create the chat by chatID (groupId)
        let chat = await Chat.findOne({ chatID: groupId });
  
        if (!chat) {
          // Create a new chat if not found
          chat = new Chat({
            chatID: groupId,
            users: [userId], // Initialize with the user sending the message
          });
        }
  
        // Create the new message
        const newMessage = {
          userId: userId,
          message: message,
          timeSent: new Date(),
          groupId: groupId,
        };
  
        // Add the new message to the chat's messages array
        chat.messages.push(newMessage);
  
        // Ensure that the users array includes all participants
        if (!chat.users.includes(userId)) {
          chat.users.push(userId);
        }
  
        // Save the updated chat document
        await chat.save();
  
        // Emit the message to all clients in the chat's room
        io.emit("receiveMessage", newMessage);
        console.log(newMessage, "newMessage");
  
        console.log(`Message sent to chat ${groupId}: ${message}`);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });
  
    socket.on("typing", ({ groupId, userId, isTyping }) => {
      if (isTyping) {
        activeTypers.add(userId);
      } else {
        activeTypers.delete(userId);
      }
  
      io.to(groupId).emit("isTyping", { userId, isTyping });
    });
  
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      activeTypers.forEach((userId) => {
        io.emit("isTyping", { userId, isTyping: false });
      });
      activeTypers.clear();
    });
  });
  