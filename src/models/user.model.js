import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema= new Schema({
    username:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true

    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName:{
        type: String,
        required: true,
        trim: true,
    },
    avatar:{
        type: String,
        required: true,
        
    },
    coverImage:{
        type: String,
    },
    password:{
        type: String,
        required: [true, "password is required"]
    },
    refreshToken:{
        type: String,
    },
    watchHistory:[{
        type: Schema.Types.ObjectId,
        ref: "Video"

    }]

},
{
    timestamps: true
}

);

// middleware
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password=bcrypt.hash(this.password,10)
    next()
})

// methods
userSchema.methods.isPasswordCorrect= async function (password){
    return await bcrypt.compare(password, this.password);
}

export const User= mongoose.model("User", userSchema);