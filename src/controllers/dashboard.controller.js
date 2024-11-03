import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// Get channel statistics
const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get total number of videos uploaded by the user
    const totalVideos = await Video.countDocuments({ owner: userId });

    // Get total views from all videos
    const totalViews = await Video.aggregate([
        { $match: { owner: userId } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);

    // Get total likes across all videos
    const totalLikes = await Like.countDocuments({ video: { $in: await Video.find({ owner: userId }).select("_id") } });

    // Get total subscribers
    const totalSubscribers = await Subscription.countDocuments({ channel: userId });

    res.status(200).json(new ApiResponse(200, {
        totalVideos,
        totalViews: totalViews.length ? totalViews[0].totalViews : 0,
        totalLikes,
        totalSubscribers
    }, "Channel statistics fetched successfully"));
});

// Get videos uploaded by the channel owner
const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }, // Sort videos by most recent
        populate: { path: "owner", select: "username" }, // Populate owner information
    };

    const videos = await Video.paginate({ owner: userId }, options);

    res.status(200).json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export {
    getChannelStats, 
    getChannelVideos
    }