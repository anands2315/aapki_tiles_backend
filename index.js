const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const compression = require('compression');
const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// Import Routers
const userRouter = require("./routes/user");
const companyProfileRouter = require("./routes/company_profile");
const categoryRouter = require("./routes/category");
const dealerRouter = require("./routes/dealer");

// INITIALIZE
const PORT = 3000;
const app = express();
const DB = "mongodb+srv://anand:%40aapki%23Tiles23@cluster0.ko3mo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => !req.headers['x-no-compression']
}));


app.use(userRouter);
app.use(companyProfileRouter);
app.use(categoryRouter);
app.use(dealerRouter);

// Multer Configuration for File Uploads
const storage = multer.memoryStorage();

// Initialize Multer
const upload = multer({
    storage: storage, 
});

// Updated Image Schema
const ImageSchema = new mongoose.Schema({
    image: {
        data: String,       
        contentType: String 
    },
    additionalField1: String,
    additionalField2: String,
});

const ImageModel = mongoose.model('Image', ImageSchema);

// POST Method for Uploading Image
app.post('/uploads', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const { additionalField1, additionalField2 } = req.body;

    // Convert the image buffer to Base64
    const encodedImage = req.file.buffer.toString('base64');

    // Create a new document in MongoDB with the required image structure
    const newImage = new ImageModel({
        image: {
            data: encodedImage,
            contentType: req.file.mimetype
        },
        additionalField1, 
        additionalField2,
    });

    newImage.save()
        .then(() => {
            res.status(200).send({
                message: 'File and data uploaded and stored in MongoDB!',
                fileId: newImage._id,
            });
        })
        .catch(err => res.status(500).send('Error storing file: ' + err.message));
});

// GET Method to Retrieve Image and Data from MongoDB
app.get('/uploads/:id', async (req, res) => {
    try {
        const imageId = req.params.id;
        console.log('Received Image ID:', imageId);  // Log to debug

        // Find the image by ID
        const image = await ImageModel.findById(imageId);

        if (!image) {
            console.log('Image not found');
            return res.status(404).send('Image not found');
        }

        // Send the image and additional fields in the response
        res.status(200).send({
            image: image.image,  
            additionalField1: image.additionalField1,
            additionalField2: image.additionalField2,
        });

    } catch (error) {
        console.error('Error retrieving image:', error.message);
        res.status(500).send('Error retrieving image: ' + error.message);
    }
});



// CONNECT TO DATABASE
const connectDB = async () => {
    try {
        await mongoose.connect(DB);
        console.log("Connection Successful");
    } catch (error) {
        console.error("Error connecting to the database:", error);
    }
};

// Start Server
const startServer = async () => {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`connected at port ${PORT}`);
    });
};

startServer();
