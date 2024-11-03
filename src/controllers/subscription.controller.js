import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


// Toggle subscription for a channel
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user.id; // Assuming user ID is stored in req.user

    // Check if the IDs are valid
    if (!isValidObjectId(channelId) || !isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid IDs");
    }

    // Check if the subscription exists
    const existingSubscription = await Subscription.findOne({ channel: channelId, subscriber: subscriberId });

    if (existingSubscription) {
        // If exists, remove the subscription
        await Subscription.deleteOne({ channel: channelId, subscriber: subscriberId });
        return res.status(200).json(new ApiResponse(200, null, "Unsubscribed successfully"));
    } else {
        // If not exists, create a new subscription
        const newSubscription = await Subscription.create({
            channel: channelId,
            subscriber: subscriberId,
        });
        return res.status(201).json(new ApiResponse(201, newSubscription, "Subscribed successfully"));
    }
});


// Get the subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // Check if the channelId is valid
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    // Find all subscribers for the given channel
    const subscribers = await Subscription.find({ channel: channelId }).populate("subscriber", "username"); // Populate username or other fields as necessary

    return res.status(200).json(new ApiResponse(200, subscribers, "Fetched subscribers successfully"));
});


// Get the list of channels to which the user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId = req.user.id; // Assuming user ID is stored in req.user

    // Check if the subscriberId is valid
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    // Find all subscriptions for the user and populate channel details
    const subscriptions = await Subscription.find({ subscriber: subscriberId }).populate("channel", "username"); // Populate with channel details

    return res.status(200).json(new ApiResponse(200, subscriptions, "Fetched subscribed channels successfully"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}