import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectDB= async()=>{
    try {
        const connectInstance= await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`mongo db connecteded succesfully ${connectInstance.connection.host}`);
        
    } catch (error) {
        console.log("Mongo db failed");
        throw error
        
        
    }
}

export default connectDB