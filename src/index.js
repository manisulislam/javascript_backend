import dotenv from "dotenv"
import {app} from "./app.js"
import connectDB from "./db/index.js"
dotenv.config({
    path: './env'
})

const port= process.env.PORT || 5000;

connectDB()

.then(() => {
    app.listen( port, ()=>{
        console.log(` server is ready on ${port}`);
    })
}).catch((err) => {
    console.log("Connection is failed");
});



