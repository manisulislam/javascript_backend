import dotenv from "dotenv"
import express from "express"
import connectDB from "./db/index.js"
dotenv.config({
    path: './env'
})

const app=express()
const port= process.env.PORT || 5000;

app.listen( port, ()=>{
    console.log(` server is ready on ${port}`);
})
connectDB()

