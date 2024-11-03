import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;

    const filters = {};
    if (query) {
        filters.$or = [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
        ];
    }
    if (userId && isValidObjectId(userId)) {
        filters.owner = userId;
    }

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: sortType === 'asc' ? 1 : -1 },
    };

    const result = await Video.aggregatePaginate(Video.aggregate().match(filters), options);

    res.status(200).json(new ApiResponse(200, result, "Videos retrieved successfully."));
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const videoFile = req.files.videoFile[0]; // Assuming multer is used and files are available in req.files

    if (!videoFile) {
        throw new ApiError(400, "Video file is required.");
    }

    const uploadedVideo = await uploadOnCloudinary(videoFile.path, "video"); // Upload to Cloudinary
    const newVideo = await Video.create({
        videoFile: uploadedVideo.secure_url,
        thumbnail: req.files.thumbnail[0].path, // Assuming thumbnail is provided
        title,
        description,
        duration: req.body.duration || 0, // Optional duration
        isPublished: true,
        owner: req.user.id, // Assuming the user is authenticated
    });

    res.status(201).json(new ApiResponse(201, newVideo, "Video published successfully."));
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found.");
    }

    res.status(200).json(new ApiResponse(200, video, "Video retrieved successfully."));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (req.file) updateFields.thumbnail = req.file.path; // Assuming thumbnail upload is optional

    const updatedVideo = await Video.findByIdAndUpdate(videoId, updateFields, { new: true });
    if (!updatedVideo) {
        throw new ApiError(404, "Video not found.");
    }

    res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully."));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);
    if (!deletedVideo) {
        throw new ApiError(404, "Video not found.");
    }

    res.status(200).json(new ApiResponse(200, null, "Video deleted successfully."));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found.");
    }

    video.isPublished = !video.isPublished; // Toggle the publish status
    await video.save();

    res.status(200).json(new ApiResponse(200, video, "Video publish status toggled successfully."));
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}