const express = require('express');
const Category = require('../models/category');
const categoryRouter = express.Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// CREATE: Add categories and subcategories
categoryRouter.post('/api/add-categories', async (req, res) => {
    try {
        let data = req.body;

        // Ensure data is an array
        if (!Array.isArray(data)) {
            data = [data];
        }

        const categoriesMap = new Map();

        data.forEach((item) => {
            const category = item['category1'];

            // Skip if category is null or 'null'
            if (category && category !== 'null') {

                const subcategories = [];

                const subcategory1 = item['subCategory1'];
                if (subcategory1 && subcategory1 !== 'null') {
                    subcategories.push(subcategory1);
                }

                const subcategory2 = item['subCategory2'];
                if (subcategory2 && subcategory2 !== 'null') {
                    subcategories.push(subcategory2);
                }

                // Skip if no valid subcategories
                if (subcategories.length > 0) {
                    if (categoriesMap.has(category)) {
                        const existingSubcategories = categoriesMap.get(category);
                        subcategories.forEach(subcategory => {
                            if (!existingSubcategories.includes(subcategory)) {
                                existingSubcategories.push(subcategory);
                            }
                        });
                        categoriesMap.set(category, existingSubcategories);
                    } else {
                        categoriesMap.set(category, subcategories);
                    }
                }
            }
        });

        // Create or update categories with their subcategories
        const categoryPromises = [];
        categoriesMap.forEach((subcategories, category) => {
            const categoryPromise = Category.findOneAndUpdate(
                { category },
                { $set: { subcategories } },
                { upsert: true, new: true }
            );
            categoryPromises.push(categoryPromise);
        });

        await Promise.all(categoryPromises);
        res.status(200).json({ message: 'Categories and subcategories saved successfully' });
    } catch (error) {
        console.error(error); // Log the error details
        res.status(500).json({ error: 'An error occurred while saving categories', details: error.message });
    }
});

categoryRouter.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find();

        const categoriesWithBase64Image = categories.map(category => {
            if (category.image && category.image.data) {
                return {
                    ...category._doc,
                    image: {
                        data: category.image.data.toString('base64'),
                        contentType: category.image.contentType,
                    }
                };
            }
            return category;
        });

        res.status(200).json(categoriesWithBase64Image);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching categories' });
    }
});

categoryRouter.get('/api/categories/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        let categoryWithBase64Image = category;

        if (category.image && category.image.data) {
            categoryWithBase64Image = {
                ...category._doc,
                image: {
                    data: category.image.data.toString('base64'),
                    contentType: category.image.contentType,
                }
            };
        }

        res.status(200).json(categoryWithBase64Image);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the category' });
    }
});


// UPDATE: Update category and its subcategories by ID
categoryRouter.put('/api/categories/:id', upload.single('image'), async (req, res) => {
    try {
        const { category, subcategories } = req.body;

        // Build the update object
        const updateData = { category, subcategories };

        // If there's an image in the request, add it to the update object
        if (req.file) {
            updateData.image = {
                data: req.file.buffer,
                contentType: req.file.mimetype,
            };
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true } // Returns the updated document
        );

        if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the category', details: error.message });
    }
});

// DELETE: Remove a category by ID
categoryRouter.delete('/api/categories/:id', async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the category' });
    }
});

module.exports = categoryRouter;
