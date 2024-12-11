const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Chat = require("./models/Chat");
const authRouter = require("./router/auth/auth");
const postRouter = require("./router/auth/post");
const deliverRouter = require("./router/auth/deliverparcelRoutes");
const driverRoutes = require("./router/auth/driverRouter");
const passengerRouter = require("./router/auth/passengerRouter");
const parcelRouter = require("./router/auth/sendParcelRoutes");
const chatRouter = require("./router/chat/Chat");
const backblazeRouter = require("./router/auth/backblaze");
const Driver = require("./models/driver");
const PassengerRequest = require("./models/Passengers");
const adminRouter = require("./router/admin/admin");
const dashboardRouter = require("./router/admin/dashboard");


// MongoDB connection
mongoose
  .connect(
    "mongodb+srv://ikennaibenemee:New@cluster0.rkncs8m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error: ", err));
//mongodb+srv://ikennaibenemee:<gt45CfCiuk3o9wN0cluster0.rkncs8m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
// Middleware
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/post", postRouter);
app.use("/api/deliver", deliverRouter);
app.use("/api/parcel", parcelRouter);
app.use("/api/drivers", driverRoutes);
app.use("/api/passenger", passengerRouter);
app.use("/api", chatRouter);
app.use("/api/backblaze", backblazeRouter);
app.use("/api/admin", adminRouter);
app.use("/api/dashboard", dashboardRouter);
//chatRouter
//mongoose.set("debug", true);

// Socket.IO Configuration
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your frontend URL in production
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Userns connected: ${socket.id}`);

  // Dynamically join room based on chatID
  socket.on("joinRoom", (chatID) => {
    socket.join(chatID);
    console.log(`User ${socket.id} joined room: ${chatID}`);
  });

  // Sending a message
  socket.on(
    "sendMessage",
    async ({
      chatID,
      userID,
      message,
      fetchID,
      passID,
      type,
      passenger,
      user_first_name,
      user_last_name,
    }) => {
      console.log(user_first_name, user_last_name, !!passenger, "passenger");
      try {
        let chat = await Chat.findOne({ chatID });

        if (!chat) {
          chat = new Chat({
            chatID,
            users: [userID],
            messages: [],
            fetchID: fetchID,
            passID: passID || null,
            user_first_name: user_first_name || null,
            user_last_name: user_last_name || null,
          });
        } else {
          // If chat exists and passID is not set, update it
          if (!chat.passID && passID) {
            chat.passID = passID;
            await chat.save();
          }
        }
        if (type === "ride") {
          let passengerDetails = await PassengerRequest.findOne({
            _id: passID,
          });
          console.log(passengerDetails, "passengerDetails");
        }
        const newMessage = {
          userId: userID,
          message,
          passenger: !!passenger, // Convert to boolean,
          //timeSent: new Date().toISOString(), // Ensuring it's in ISO format
        };

        chat.messages.push(newMessage);
        await chat.save();

        io.to(chatID).emit("receiveMessage", newMessage);
        console.log(`Message sent in room ${chatID}`);
      } catch (error) {
        console.error("Error saving message: ", error);
      }
    }
  );

  // Disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});
console.log(`Userns connected`);
// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
