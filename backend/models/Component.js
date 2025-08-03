const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['inward', 'outward']
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Reason cannot exceed 200 characters']
    },
    project: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

const componentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Component name is required'],
        trim: true,
        maxlength: [200, 'Component name cannot exceed 200 characters']
    },
    partNumber: {
        type: String,
        required: [true, 'Part number is required'],
        trim: true,
        maxlength: [100, 'Part number cannot exceed 100 characters'],
        index: true
    },
    manufacturer: {
        type: String,
        required: [true, 'Manufacturer is required'],
        trim: true,
        maxlength: [100, 'Manufacturer name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: [
                'Passive Components',
                'Semiconductors', 
                'Microcontrollers',
                'Sensors',
                'Memory',
                'Timing Components',
                'Power Management',
                'Connectors',
                'Displays',
                'Other'
            ],
            message: 'Invalid category selected'
        },
        index: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative'],
        default: 0
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true,
        maxlength: [50, 'Location cannot exceed 50 characters'],
        index: true
    },
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Unit price cannot be negative']
    },
    criticalLowThreshold: {
        type: Number,
        required: [true, 'Critical low threshold is required'],
        min: [0, 'Critical low threshold cannot be negative']
    },
    datasheetLink: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return true; // Optional field
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Datasheet link must be a valid URL'
        }
    },
    movements: [movementSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for better query performance
componentSchema.index({ name: 'text', partNumber: 'text', manufacturer: 'text', description: 'text' });
componentSchema.index({ category: 1, location: 1 });
componentSchema.index({ quantity: 1 });
componentSchema.index({ 'movements.createdAt': -1 });

// Virtual for stock status
componentSchema.virtual('stockStatus').get(function() {
    if (this.quantity <= 0) {
        return 'out_of_stock';
    } else if (this.quantity <= this.criticalLowThreshold) {
        return 'low_stock';
    } else {
        return 'in_stock';
    }
});

// Virtual for total value
componentSchema.virtual('totalValue').get(function() {
    return this.quantity * this.unitPrice;
});

// Virtual for age in days
componentSchema.virtual('ageInDays').get(function() {
    if (!this.createdAt) return 0;
    const now = new Date();
    const diffTime = Math.abs(now - this.createdAt);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for last movement date
componentSchema.virtual('lastMovementDate').get(function() {
    if (!this.movements || this.movements.length === 0) return null;
    
    const sortedMovements = this.movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sortedMovements[0].createdAt;
});

// Method to check if component is old stock (no outward movement in X days)
componentSchema.methods.isOldStock = function(thresholdDays = 90) {
    if (!this.movements || this.movements.length === 0) {
        return this.ageInDays > thresholdDays;
    }
    
    const outwardMovements = this.movements.filter(m => m.type === 'outward');
    if (outwardMovements.length === 0) {
        return this.ageInDays > thresholdDays;
    }
    
    const lastOutwardMovement = outwardMovements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const daysSinceLastOutward = Math.ceil((new Date() - new Date(lastOutwardMovement.createdAt)) / (1000 * 60 * 60 * 24));
    
    return daysSinceLastOutward > thresholdDays;
};

// Method to add movement
componentSchema.methods.addMovement = function(movementData) {
    this.movements.push(movementData);
    
    // Update quantity based on movement type
    if (movementData.type === 'inward') {
        this.quantity += movementData.quantity;
    } else if (movementData.type === 'outward') {
        this.quantity = Math.max(0, this.quantity - movementData.quantity);
    }
    
    return this;
};

// Pre-save middleware
componentSchema.pre('save', function(next) {
    // Update lastUpdatedBy if movements array was modified
    if (this.isModified('movements') && this.movements.length > 0) {
        const lastMovement = this.movements[this.movements.length - 1];
        this.lastUpdatedBy = lastMovement.user;
    }
    next();
});

// Ensure virtual fields are serialized
componentSchema.set('toJSON', { virtuals: true });
componentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Component', componentSchema);