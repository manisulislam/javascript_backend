import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


// Create a new playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name || !description) {
        throw new ApiError(400, "Name and description are required.");
    }

    const playlist = await Playlist.create({ name, description, owner: userId });
    res.status(201).json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

// Get all playlists for a specific user
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID.");
    }

    const playlists = await Playlist.find({ owner: userId }).populate("videos");
    res.status(200).json(new ApiResponse(200, playlists, "User's playlists retrieved successfully"));
});


// Get a single playlist by ID
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID.");
    }

    const playlist = await Playlist.findById(playlistId).populate("videos");
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }

    res.status(200).json(new ApiResponse(200, playlist, "Playlist retrieved successfully"));
});

// Add a video to a playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }

    if (playlist.owner.toString() !== req.user.id) {
        throw new ApiError(403, "You are not authorized to modify this playlist.");
    }

    if (!playlist.videos.includes(videoId)) {
        playlist.videos.push(videoId);
        await playlist.save();
    }

    res.status(200).json(new ApiResponse(200, playlist, "Video added to playlist successfully"));
});


// Remove a video from a playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }

    if (playlist.owner.toString() !== req.user.id) {
        throw new ApiError(403, "You are not authorized to modify this playlist.");
    }

    playlist.videos = playlist.videos.filter(video => video.toString() !== videoId);
    await playlist.save();

    res.status(200).json(new ApiResponse(200, playlist, "Video removed from playlist successfully"));
});

// Delete a playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }

    if (playlist.owner.toString() !== req.user.id) {
        throw new ApiError(403, "You are not authorized to delete this playlist.");
    }

    await playlist.remove();
    res.status(200).json(new ApiResponse(200, null, "Playlist deleted successfully"));
});

// Update a playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }

    if (playlist.owner.toString() !== req.user.id) {
        throw new ApiError(403, "You are not authorized to update this playlist.");
    }

    playlist.name = name || playlist.name;
    playlist.description = description || playlist.description;
    await playlist.save();

    res.status(200).json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}