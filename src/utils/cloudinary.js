import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

const cloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type: "auto"})
        return response;
        
    } catch (error) {
        fs.unlink(localFilePath)
    }

}
