import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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


const registerUser= asyncHandler(async (req,res)=>{
    // 1. get user details from frontend
    // 2. validation - not empty
    // 3. check if user already exists- username, email
    // 4. check for images, check for avatar
    // 5. upload them to cloudinary, avatar
    // 6. create user object- create entry in db
    // 7. remove password and refresh token field from response
    // 8. check for user creation
    // 9. return response
    
    const {username, email, fullName, password}=req.body;
    // console.log(username, email, fullName, password);


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



    // 4. check for images, check for avatar
    const avatarLocalFilePath=req.files?.avatar[0]?.path;
    // const coverImageLocalFilePath= req.files?.coverImage[0]?.path;

    let coverImageLocalFilePath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalFilePath=req.files.coverImage[0].path;
    }

    if (!avatarLocalFilePath) {
        throw new ApiError(400, "Avatar file is required");
        
    }



    // 5. upload them to cloudinary, avatar
    const avatar= await uploadOnCloudinary(avatarLocalFilePath);
    const coverImage= await uploadOnCloudinary(coverImageLocalFilePath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
        
    }


    // 6. create user object- create entry in db

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
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

const loginUser= asyncHandler(async (req, res)=>{
    // req.body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {username, email, password}= req.body

    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

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
        secure: true
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

const logOutUser = asyncHandler( async (req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
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
export {
    registerUser,
    loginUser,
    logOutUser

};