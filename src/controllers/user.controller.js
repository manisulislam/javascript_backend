import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// generate and refresh token method
const genereateAccessTokenAndRefreshToken= async(userId) =>
    {
        const user= await User.findById(userId);
        const userAccessToken= await user.generateAccessToken();
        const userRefreshToken= await user.generateRefreshToken();

        user.refreshToken = userRefreshToken;
        user.save({validateBeforeSave: false});
        return { userAccessToken, userRefreshToken };
    }

// register controller
const registerUser= asyncHandler(async (req,res)=>{
    
    
    const {username, email, fullName, password}=req.body;
    // console.log(username, email, fullName, password);

    console.log(req.body)
    if(
        [username,email,fullName,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400, "All fields are required")
    };
    


    // 3. check if user already exists- username, email
    const existedUser= await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    };



    
    // 6. create user object- create entry in db

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        
    })

    // 7. remove password and refresh token field from response
    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // 8. check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
        
    }

    // 9. return response

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
    
})


// login controller
const loginUser= asyncHandler(async (req, res)=>{
    // req.body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {username, email, password}= req.body

    if(!(username && email)){
        throw new ApiError(400, "username or email is required")
    }
    console.log({
        "username": username,
        "email":email,
        "password": password
    });
    // if(!email){
    //     throw new ApiError(400, "email is required")
    // }

    const user = await User.findOne({
        $or: [{username},{email}]
    })
    // const user = await User.findOne(email)

    if(!user){
        throw new ApiError(409, "user does not exists.")
    }

    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404, "Password is not valid while login . Please enter correct password")
    }

    const {userAccessToken,userRefreshToken}= await genereateAccessTokenAndRefreshToken(user._id)

    const logedInUser= await User.findById(user._id).select("-password -refreshToken")

    const options= {
        httpOnly: true,
        secure: true,
        
    }

    return res
    .status(200)
    .cookie("accessToken", userAccessToken, options)
    .cookie("refreshToken", userRefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: logedInUser, userAccessToken, userRefreshToken
            },
            "User logedIn successfully"
        )
    )

})


// logout controller
const logOutUser = asyncHandler( async (req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options= {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})


// refresh token controller
const refreshAccessToken= asyncHandler( async(req, res)=>{

    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)

    if (!user) {
        throw new ApiError(401, "Unauthorized refresh token")
    }
    
    if(incomingRefreshToken !== user.refreshToken){
        throw new ApiError(401, "Invalid refresh token")
    }
    
    const {userAccessToken,userRefreshToken}= genereateAccessTokenAndRefreshToken(user._id)

    const options={
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", userAccessToken, options)
    .cookie("refreshToken", userRefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {userAccessToken, userRefreshToken},
            "Access token refreshed"
        )
    )
})

// change password
const changeCurrentPassword= asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword}= req.body

    const user= await User.findById(req.user?._id)

    const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password= newPassword
    await user.save({validateBeforeSave: true})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


// get current user
const getCurrentUser = asyncHandler(async(req, res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})


// update account details
const updateUserDetails = asyncHandler( async (req, res ) =>{
    const {fullName, email} = req.body
    const user= await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {
            new: true
        }
    
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"))
})


// update avatar file
const updateAvatar= asyncHandler(async(req, res)=>{
    const avatarLocalFilePath= req.file?.path
    if(!avatarLocalFilePath){
        throw new ApiError(400, "Avatar file is missing")
    }
    const avatar= await uploadOnCloudinary(avatarLocalFilePath)
    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"))
})

// update cover image
const updateCoverImage= asyncHandler(async(req, res)=>{
    const coverImageLocalFilePath= req.file?.path
    if(!coverImageLocalFilePath){
        throw new ApiError(400, "Cover image file is missing")
    }
    const coverImage= await uploadOnCloudinary(coverImageLocalFilePath)
    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on cover image")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"))
})


// get user channel profile
const getUserChannelProfile =  asyncHandler(async (req, res) => {
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(401,  "username is missing")
    }

    const channel= await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "Subscription",
                localField: "_id",
                foreignField: "subscriptions",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "Subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }   
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel does not exists")
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})


// get watch history
const getWatchHistory = asyncHandler(async (req, res)=>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            $first: "$owner"
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watchHistory fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory

};