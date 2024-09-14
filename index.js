const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const userRouter = require("./routes/user");
const companyProfileRouter = require("./routes/company_profile");
const categoryRouter = require("./routes/category");

// INITIALIZE
const PORT = 3000;
const app = express();
const DB = "mongodb+srv://anand:%40aapki%23Tiles23@cluster0.ko3mo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(userRouter);
app.use(companyProfileRouter);
app.use(categoryRouter);

// CONNECT TO DATABASE
const connectDB = async () => {
    try {
        await mongoose.connect(DB);
        console.log("Connection Successful");
    } catch (error) {
        console.error("Error connecting to the database:", error);
    }
};

const startServer = async () => {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`connected at port ${PORT}`);
    });
};

startServer();
