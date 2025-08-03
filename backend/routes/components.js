const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Component = require('../models/Component');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/components
// @desc    Get all components with filtering, searching, and pagination
// @access  Private
router.get('/', authenticate, authorize('view'), [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isLength({ max: 200 }).withMessage('Search query too long'),
    query('category').optional().isIn([
        'Passive Components', 'Semiconductors', 'Microcontrollers', 
        'Sensors', 'Memory', 'Timing Components', 'Power Management', 
        'Connectors', 'Displays', 'Other'
    ]).withMessage('Invalid category'),
    query('location').optional().isLength({ max: 50 }).withMessage('Location query too long'),
    query('stockStatus').optional().isIn(['in_stock', 'low_stock', 'out_of_stock']).withMessage('Invalid stock status'),
    query('sortBy').optional().isIn(['name', 'partNumber', 'quantity', 'unitPrice', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            page = 1,
            limit = 50,
            search,
            category,
            location,
            stockStatus,
            minQuantity,
            maxQuantity,
            minPrice,
            maxPrice,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        // Build filter object
        const filter = { isActive: true };

        // Text search
        if (search) {
            filter.$text = { $search: search };
        }

        // Category filter
        if (category) {
            filter.category = category;
        }

        // Location filter
        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }

        // Quantity filters
        if (minQuantity || maxQuantity) {
            filter.quantity = {};
            if (minQuantity) filter.quantity.$gte = parseInt(minQuantity);
            if (maxQuantity) filter.quantity.$lte = parseInt(maxQuantity);
        }

        // Price filters
        if (minPrice || maxPrice) {
            filter.unitPrice = {};
            if (minPrice) filter.unitPrice.$gte = parseFloat(minPrice);
            if (maxPrice) filter.unitPrice.$lte = parseFloat(maxPrice);
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const components = await Component.find(filter)
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'name username')
            .populate('lastUpdatedBy', 'name username')
            .lean();

        // Get total count for pagination
        const total = await Component.countDocuments(filter);

        // Add computed fields
        const componentsWithStatus = components.map(component => {
            // Calculate stock status
            let stockStatus;
            if (component.quantity <= 0) {
                stockStatus = 'out_of_stock';
            } else if (component.quantity <= component.criticalLowThreshold) {
                stockStatus = 'low_stock';
            } else {
                stockStatus = 'in_stock';
            }

            // Calculate age in days
            const ageInDays = Math.ceil((new Date() - new Date(component.createdAt)) / (1000 * 60 * 60 * 24));

            // Check if old stock
            const isOldStock = ageInDays > 90; // 90 days threshold

            return {
                ...component,
                stockStatus,
                totalValue: component.quantity * component.unitPrice,
                ageInDays,
                isOldStock
            };
        });

        // Filter by stock status if requested
        let filteredComponents = componentsWithStatus;
        if (stockStatus) {
            filteredComponents = componentsWithStatus.filter(comp => comp.stockStatus === stockStatus);
        }

        res.json({
            success: true,
            data: filteredComponents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get components error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching components'
        });
    }
});

// @route   GET /api/components/:id
// @desc    Get single component by ID
// @access  Private
router.get('/:id', authenticate, authorize('view'), async (req, res) => {
    try {
        const component = await Component.findOne({
            _id: req.params.id,
            isActive: true
        })
        .populate('createdBy', 'name username')
        .populate('lastUpdatedBy', 'name username')
        .populate('movements.user', 'name username');

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        res.json({
            success: true,
            data: component
        });

    } catch (error) {
        console.error('Get component error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching component'
        });
    }
});

// @route   POST /api/components
// @desc    Create new component
// @access  Private
router.post('/', authenticate, authorize('edit'), [
    body('name')
        .trim()
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage('Component name is required and cannot exceed 200 characters'),
    body('partNumber')
        .trim()
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Part number is required and cannot exceed 100 characters'),
    body('manufacturer')
        .trim()
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Manufacturer is required and cannot exceed 100 characters'),
    body('category')
        .isIn([
            'Passive Components', 'Semiconductors', 'Microcontrollers',
            'Sensors', 'Memory', 'Timing Components', 'Power Management',
            'Connectors', 'Displays', 'Other'
        ])
        .withMessage('Invalid category'),
    body('quantity')
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),
    body('location')
        .trim()
        .notEmpty()
        .isLength({ max: 50 })
        .withMessage('Location is required and cannot exceed 50 characters'),
    body('unitPrice')
        .isFloat({ min: 0 })
        .withMessage('Unit price must be a non-negative number'),
    body('criticalLowThreshold')
        .isInt({ min: 0 })
        .withMessage('Critical low threshold must be a non-negative integer'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('datasheetLink')
        .optional()
        .isURL()
        .withMessage('Datasheet link must be a valid URL')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Check if component with same part number already exists
        const existingComponent = await Component.findOne({
            partNumber: req.body.partNumber,
            isActive: true
        });

        if (existingComponent) {
            return res.status(400).json({
                success: false,
                message: 'Component with this part number already exists'
            });
        }

        // Create component
        const component = new Component({
            ...req.body,
            createdBy: req.user._id
        });

        await component.save();

        // Populate user data
        await component.populate('createdBy', 'name username');

        // Create notification for new component
        if (req.body.quantity > 0) {
            const notification = new Notification({
                type: 'success',
                title: 'New Component Added',
                message: `${component.name} (${component.partNumber}) has been added to inventory`,
                category: 'system',
                priority: 'low',
                relatedComponent: component._id,
                relatedUser: req.user._id,
                targetRoles: ['admin'],
                metadata: {
                    componentId: component._id.toString(),
                    componentName: component.name,
                    componentPartNumber: component.partNumber,
                    initialQuantity: component.quantity
                }
            });

            await notification.save();
        }

        res.status(201).json({
            success: true,
            message: 'Component created successfully',
            data: component
        });

    } catch (error) {
        console.error('Create component error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating component'
        });
    }
});

// @route   PUT /api/components/:id
// @desc    Update component
// @access  Private
router.put('/:id', authenticate, authorize('edit'), [
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage('Component name cannot exceed 200 characters'),
    body('partNumber')
        .optional()
        .trim()
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Part number cannot exceed 100 characters'),
    body('manufacturer')
        .optional()
        .trim()
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Manufacturer cannot exceed 100 characters'),
    body('category')
        .optional()
        .isIn([
            'Passive Components', 'Semiconductors', 'Microcontrollers',
            'Sensors', 'Memory', 'Timing Components', 'Power Management',
            'Connectors', 'Displays', 'Other'
        ])
        .withMessage('Invalid category'),
    body('quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),
    body('location')
        .optional()
        .trim()
        .notEmpty()
        .isLength({ max: 50 })
        .withMessage('Location cannot exceed 50 characters'),
    body('unitPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Unit price must be a non-negative number'),
    body('criticalLowThreshold')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Critical low threshold must be a non-negative integer'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('datasheetLink')
        .optional()
        .isURL()
        .withMessage('Datasheet link must be a valid URL')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Find component
        const component = await Component.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Check if part number is being changed and if it already exists
        if (req.body.partNumber && req.body.partNumber !== component.partNumber) {
            const existingComponent = await Component.findOne({
                partNumber: req.body.partNumber,
                isActive: true,
                _id: { $ne: req.params.id }
            });

            if (existingComponent) {
                return res.status(400).json({
                    success: false,
                    message: 'Component with this part number already exists'
                });
            }
        }

        // Update component
        const updatedComponent = await Component.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                lastUpdatedBy: req.user._id
            },
            { new: true, runValidators: true }
        ).populate('createdBy lastUpdatedBy', 'name username');

        res.json({
            success: true,
            message: 'Component updated successfully',
            data: updatedComponent
        });

    } catch (error) {
        console.error('Update component error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating component'
        });
    }
});

// @route   DELETE /api/components/:id
// @desc    Delete component (soft delete)
// @access  Private/Admin
router.delete('/:id', authenticate, authorize('all'), async (req, res) => {
    try {
        const component = await Component.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Soft delete
        component.isActive = false;
        component.lastUpdatedBy = req.user._id;
        await component.save();

        res.json({
            success: true,
            message: 'Component deleted successfully'
        });

    } catch (error) {
        console.error('Delete component error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting component'
        });
    }
});

// @route   GET /api/components/stats/summary
// @desc    Get inventory statistics
// @access  Private
router.get('/stats/summary', authenticate, authorize('view'), async (req, res) => {
    try {
        const stats = await Component.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalComponents: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
                    avgUnitPrice: { $avg: '$unitPrice' }
                }
            }
        ]);

        // Get low stock items
        const lowStockItems = await Component.countDocuments({
            isActive: true,
            $expr: { $lte: ['$quantity', '$criticalLowThreshold'] }
        });

        // Get out of stock items
        const outOfStockItems = await Component.countDocuments({
            isActive: true,
            quantity: 0
        });

        // Get old stock items (components older than 90 days without outward movement)
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const oldStockItems = await Component.countDocuments({
            isActive: true,
            createdAt: { $lt: ninetyDaysAgo },
            $or: [
                { 'movements.type': { $ne: 'outward' } },
                { movements: { $size: 0 } }
            ]
        });

        const summary = {
            totalComponents: stats[0]?.totalComponents || 0,
            totalQuantity: stats[0]?.totalQuantity || 0,
            totalValue: stats[0]?.totalValue || 0,
            avgUnitPrice: stats[0]?.avgUnitPrice || 0,
            lowStockItems,
            outOfStockItems,
            oldStockItems
        };

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching statistics'
        });
    }
});

module.exports = router;