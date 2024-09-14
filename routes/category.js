const express = require('express');
const Category = require('../models/category');
const categoryRouter = express.Router();


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
            const category = item['category'];

            // Skip if category is null or 'null'
            if (category && category !== 'null') {
                // Initialize subcategories array
                const subcategories = [];

                // Check and add valid subcategories
                const subcategory1 = item['subcategories1'];
                if (subcategory1 && subcategory1 !== 'null') {
                    subcategories.push(subcategory1);
                }

                const subcategory2 = item['subcategories2'];
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

// READ: Get all categories
categoryRouter.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching categories' });
    }
});

// READ: Get a single category by ID
categoryRouter.get('/categories/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the category' });
    }
});

// UPDATE: Update category and its subcategories by ID
categoryRouter.put('/categories/:id', async (req, res) => {
    try {
        const { category, subcategories } = req.body;
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { category, subcategories },
            { new: true } // Returns the updated document
        );
        if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the category' });
    }
});

// DELETE: Remove a category by ID
categoryRouter.delete('/categories/:id', async (req, res) => {
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
