const express = require('express');
const { body, validationResult } = require('express-validator');
const Component = require('../models/Component');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/movements/inward
// @desc    Add stock (inward movement)
// @access  Private
router.post('/inward', authenticate, authorize('inward'), [
    body('componentId')
        .isMongoId()
        .withMessage('Valid component ID is required'),
    body('quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer'),
    body('reason')
        .trim()
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage('Reason is required and cannot exceed 200 characters'),
    body('project')
        .trim()
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Project is required and cannot exceed 100 characters'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
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

        const { componentId, quantity, reason, project, notes } = req.body;

        // Find component
        const component = await Component.findOne({
            _id: componentId,
            isActive: true
        });

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Store old quantity for notification
        const oldQuantity = component.quantity;

        // Create movement object
        const movement = {
            type: 'inward',
            quantity,
            user: req.user._id,
            userName: req.user.name,
            reason,
            project,
            notes: notes || ''
        };

        // Add movement and update quantity
        component.addMovement(movement);
        component.lastUpdatedBy = req.user._id;

        await component.save();

        // Populate user data for response
        await component.populate('movements.user', 'name username');

        // Create notification for stock movement
        const notification = Notification.createStockMovementNotification(
            component,
            movement,
            req.user
        );
        await notification.save();

        res.json({
            success: true,
            message: `Successfully added ${quantity} units to ${component.name}`,
            data: {
                component: {
                    id: component._id,
                    name: component.name,
                    partNumber: component.partNumber,
                    oldQuantity,
                    newQuantity: component.quantity,
                    location: component.location
                },
                movement: component.movements[component.movements.length - 1]
            }
        });

    } catch (error) {
        console.error('Inward movement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while processing inward movement'
        });
    }
});

// @route   POST /api/movements/outward
// @desc    Remove stock (outward movement)
// @access  Private
router.post('/outward', authenticate, authorize('outward'), [
    body('componentId')
        .isMongoId()
        .withMessage('Valid component ID is required'),
    body('quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer'),
    body('reason')
        .trim()
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage('Reason is required and cannot exceed 200 characters'),
    body('project')
        .trim()
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Project is required and cannot exceed 100 characters'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
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

        const { componentId, quantity, reason, project, notes } = req.body;

        // Find component
        const component = await Component.findOne({
            _id: componentId,
            isActive: true
        });

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Check if sufficient quantity is available
        if (component.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${component.quantity} units, Requested: ${quantity} units`
            });
        }

        // Store old quantity for notification
        const oldQuantity = component.quantity;

        // Create movement object
        const movement = {
            type: 'outward',
            quantity,
            user: req.user._id,
            userName: req.user.name,
            reason,
            project,
            notes: notes || ''
        };

        // Add movement and update quantity
        component.addMovement(movement);
        component.lastUpdatedBy = req.user._id;

        await component.save();

        // Populate user data for response
        await component.populate('movements.user', 'name username');

        // Create notification for stock movement
        const movementNotification = Notification.createStockMovementNotification(
            component,
            movement,
            req.user
        );
        await movementNotification.save();

        // Check if component is now below critical threshold
        if (component.quantity <= component.criticalLowThreshold) {
            const lowStockNotification = Notification.createLowStockNotification(component);
            await lowStockNotification.save();
        }

        const warnings = [];
        if (component.quantity <= component.criticalLowThreshold) {
            warnings.push(`Warning: ${component.name} is now below critical threshold (${component.quantity} remaining)`);
        }
        if (component.quantity === 0) {
            warnings.push(`Alert: ${component.name} is now out of stock`);
        }

        res.json({
            success: true,
            message: `Successfully removed ${quantity} units from ${component.name}`,
            warnings,
            data: {
                component: {
                    id: component._id,
                    name: component.name,
                    partNumber: component.partNumber,
                    oldQuantity,
                    newQuantity: component.quantity,
                    location: component.location,
                    criticalLowThreshold: component.criticalLowThreshold,
                    stockStatus: component.stockStatus
                },
                movement: component.movements[component.movements.length - 1]
            }
        });

    } catch (error) {
        console.error('Outward movement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while processing outward movement'
        });
    }
});

// @route   GET /api/movements/history/:componentId
// @desc    Get movement history for a component
// @access  Private
router.get('/history/:componentId', authenticate, authorize('view'), async (req, res) => {
    try {
        const { componentId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Find component with movements
        const component = await Component.findOne({
            _id: componentId,
            isActive: true
        })
        .populate('movements.user', 'name username')
        .select('name partNumber movements');

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Sort movements by date (newest first) and paginate
        const sortedMovements = component.movements
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: {
                component: {
                    id: component._id,
                    name: component.name,
                    partNumber: component.partNumber
                },
                movements: sortedMovements,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: component.movements.length,
                    pages: Math.ceil(component.movements.length / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get movement history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching movement history'
        });
    }
});

// @route   GET /api/movements/recent
// @desc    Get recent movements across all components
// @access  Private
router.get('/recent', authenticate, authorize('view'), async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        // Aggregate recent movements from all components
        const recentMovements = await Component.aggregate([
            { $match: { isActive: true } },
            { $unwind: '$movements' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'movements.user',
                    foreignField: '_id',
                    as: 'movements.userDetails'
                }
            },
            { $unwind: '$movements.userDetails' },
            {
                $project: {
                    componentId: '$_id',
                    componentName: '$name',
                    componentPartNumber: '$partNumber',
                    movement: {
                        _id: '$movements._id',
                        type: '$movements.type',
                        quantity: '$movements.quantity',
                        reason: '$movements.reason',
                        project: '$movements.project',
                        notes: '$movements.notes',
                        createdAt: '$movements.createdAt',
                        user: {
                            _id: '$movements.userDetails._id',
                            name: '$movements.userDetails.name',
                            username: '$movements.userDetails.username'
                        }
                    }
                }
            },
            { $sort: { 'movement.createdAt': -1 } },
            { $limit: parseInt(limit) }
        ]);

        res.json({
            success: true,
            data: recentMovements
        });

    } catch (error) {
        console.error('Get recent movements error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching recent movements'
        });
    }
});

// @route   GET /api/movements/statistics
// @desc    Get movement statistics
// @access  Private
router.get('/statistics', authenticate, authorize('view'), async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let dateFilter;
        const now = new Date();

        switch (period) {
            case 'week':
                dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                const quarterStart = Math.floor(now.getMonth() / 3) * 3;
                dateFilter = new Date(now.getFullYear(), quarterStart, 1);
                break;
            case 'year':
                dateFilter = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const stats = await Component.aggregate([
            { $match: { isActive: true } },
            { $unwind: '$movements' },
            { $match: { 'movements.createdAt': { $gte: dateFilter } } },
            {
                $group: {
                    _id: '$movements.type',
                    totalQuantity: { $sum: '$movements.quantity' },
                    totalTransactions: { $sum: 1 }
                }
            }
        ]);

        // Format the response
        const formattedStats = {
            period,
            dateFrom: dateFilter,
            dateTo: now,
            inward: {
                totalQuantity: 0,
                totalTransactions: 0
            },
            outward: {
                totalQuantity: 0,
                totalTransactions: 0
            }
        };

        stats.forEach(stat => {
            if (stat._id === 'inward') {
                formattedStats.inward = {
                    totalQuantity: stat.totalQuantity,
                    totalTransactions: stat.totalTransactions
                };
            } else if (stat._id === 'outward') {
                formattedStats.outward = {
                    totalQuantity: stat.totalQuantity,
                    totalTransactions: stat.totalTransactions
                };
            }
        });

        res.json({
            success: true,
            data: formattedStats
        });

    } catch (error) {
        console.error('Get movement statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching movement statistics'
        });
    }
});

// @route   POST /api/movements/bulk-update
// @desc    Bulk update stock for multiple components
// @access  Private/Admin
router.post('/bulk-update', authenticate, authorize('all'), [
    body('updates')
        .isArray({ min: 1 })
        .withMessage('Updates array is required with at least one item'),
    body('updates.*.componentId')
        .isMongoId()
        .withMessage('Valid component ID is required for each update'),
    body('updates.*.quantity')
        .isInt()
        .withMessage('Quantity must be an integer for each update'),
    body('updates.*.reason')
        .trim()
        .notEmpty()
        .withMessage('Reason is required for each update'),
    body('reason')
        .trim()
        .notEmpty()
        .withMessage('Overall reason is required'),
    body('project')
        .trim()
        .notEmpty()
        .withMessage('Project is required')
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

        const { updates, reason, project } = req.body;
        const results = [];
        const errors_occurred = [];

        // Process each update
        for (const update of updates) {
            try {
                const component = await Component.findOne({
                    _id: update.componentId,
                    isActive: true
                });

                if (!component) {
                    errors_occurred.push({
                        componentId: update.componentId,
                        error: 'Component not found'
                    });
                    continue;
                }

                // Check if it's outward movement and sufficient stock is available
                if (update.quantity < 0 && Math.abs(update.quantity) > component.quantity) {
                    errors_occurred.push({
                        componentId: update.componentId,
                        componentName: component.name,
                        error: `Insufficient stock. Available: ${component.quantity}, Requested: ${Math.abs(update.quantity)}`
                    });
                    continue;
                }

                const oldQuantity = component.quantity;
                const movementType = update.quantity > 0 ? 'inward' : 'outward';
                const movementQuantity = Math.abs(update.quantity);

                // Create movement
                const movement = {
                    type: movementType,
                    quantity: movementQuantity,
                    user: req.user._id,
                    userName: req.user.name,
                    reason: update.reason || reason,
                    project,
                    notes: `Bulk update operation`
                };

                component.addMovement(movement);
                component.lastUpdatedBy = req.user._id;
                await component.save();

                results.push({
                    componentId: component._id,
                    componentName: component.name,
                    partNumber: component.partNumber,
                    oldQuantity,
                    newQuantity: component.quantity,
                    movementType,
                    movementQuantity
                });

            } catch (error) {
                errors_occurred.push({
                    componentId: update.componentId,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Bulk update completed. ${results.length} successful, ${errors_occurred.length} failed`,
            data: {
                successful: results,
                failed: errors_occurred
            }
        });

    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while processing bulk update'
        });
    }
});

module.exports = router;