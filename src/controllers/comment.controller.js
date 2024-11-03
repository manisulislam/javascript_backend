import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if videoId is valid
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Paginate comments
    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        populate: { path: "owner", select: "username" }, // Populate owner with username
        sort: { createdAt: -1 } // Sort by most recent
    };

    // Fetch comments
    const comments = await Comment.paginate({ video: videoId }, options);

    res.status(200).json(new ApiResponse(200, comments, "Fetched video comments successfully"));
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate content
    if (!content) {
        throw new ApiError(400, "Content is required to add a comment");
    }

    // Check if videoId is valid
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Create and save comment
    const newComment = await Comment.create({
        content,
        video: videoId,
        owner: userId,
    });

    res.status(201).json(new ApiResponse(201, newComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate comment content
    if (!content) {
        throw new ApiError(400, "Content is required to update the comment");
    }

    // Check if commentId is valid
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    // Find and update comment
    const comment = await Comment.findOneAndUpdate(
        { _id: commentId, owner: userId },
        { content },
        { new: true }
    );

    if (!comment) {
        throw new ApiError(404, "Comment not found or you do not have permission to update it");
    }

    res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if commentId is valid
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    // Find and delete comment
    const comment = await Comment.findOneAndDelete({ _id: commentId, owner: userId });

    if (!comment) {
        throw new ApiError(404, "Comment not found or you do not have permission to delete it");
    }

    res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }