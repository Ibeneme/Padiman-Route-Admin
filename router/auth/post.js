// routes/postRoutes.js
const express = require("express");
const Post = require("../../models/post");
const router = express.Router();

// Create a new post
router.post("/create", async (req, res) => {
  try {
    const { text, userId, first_name, last_name } = req.body;
    console.log(text, userId, " text, userId");

    // Ensure the userId and text are provided
    if (!text || !userId) {
      return res.status(400).json({ message: "Text and userId are required" });
    }

    const newPost = new Post({
      text,
      userId,
      first_name,
      last_name,
    });

    console.log(newPost, "newPost");

    await newPost.save();
    res
      .status(201)
      .json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating post" });
  }
});

// Update an existing post
router.put("/update", async (req, res) => {
  try {
    const { text, postId } = req.body;
    console.log(text, postId);

    // Ensure text is provided 673ebbcab55faecc749cdeb4
    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { text },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    console.log(updatedPost);
    res
      .status(200)
      .json({ message: "Post updated successfully", post: updatedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating post" });
  }
});

// Delete a post
router.delete("/delete/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    const deletedPost = await Post.findByIdAndDelete(postId);
    console.log(deletedPost, postId, 'postIdpostId');


    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting post" });
  }
});

// Get all posts
router.get("/all", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "first_name last_name email")
      .exec();

    res.status(200).json({ posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching posts" });
  }
});

module.exports = router;
