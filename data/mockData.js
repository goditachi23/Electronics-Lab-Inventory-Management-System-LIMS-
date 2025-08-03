// Mock Data for Electronics Inventory
const mockData = {
    components: [
        {
            id: 'C001',
            name: 'Ceramic Capacitor 10nF',
            manufacturer: 'Murata',
            partNumber: 'GRM188R71C103KA01D',
            description: '10nF ±10% 16V Ceramic Capacitor X7R 0603',
            quantity: 1500,
            location: 'A1-B2',
            unitPrice: 10,
            datasheetLink: 'https://www.murata.com/products/capacitor',
            category: 'Passive Components',
            criticalLowThreshold: 100,
            lastUpdated: new Date('2024-01-15'),
            addedDate: new Date('2023-10-15'),
            movements: [
                {
                    id: 'M001',
                    type: 'inward',
                    quantity: 2000,
                    user: 'Lab Tech 1',
                    date: new Date('2023-10-15'),
                    reason: 'Stock replenishment',
                    project: 'General Stock'
                },
                {
                    id: 'M002',
                    type: 'outward',
                    quantity: 500,
                    user: 'Engineer A',
                    date: new Date('2024-01-15'),
                    reason: 'Project usage',
                    project: 'Project Alpha'
                }
            ]
        },
        {
            id: 'R001',
            name: 'Resistor 10kΩ',
            manufacturer: 'Yageo',
            partNumber: 'RC0603FR-0710KL',
            description: '10kΩ ±1% 0.1W Thick Film Resistor 0603',
            quantity: 25,
            location: 'A2-B1',
            unitPrice: 7,
            datasheetLink: 'https://www.yageo.com/resistors',
            category: 'Passive Components',
            criticalLowThreshold: 50,
            lastUpdated: new Date('2024-01-20'),
            addedDate: new Date('2023-07-10'),
            movements: [
                {
                    id: 'M003',
                    type: 'inward',
                    quantity: 1000,
                    user: 'Lab Tech 2',
                    date: new Date('2023-07-10'),
                    reason: 'Initial stock',
                    project: 'General Stock'
                },
                {
                    id: 'M004',
                    type: 'outward',
                    quantity: 975,
                    user: 'Researcher B',
                    date: new Date('2024-01-20'),
                    reason: 'Prototype testing',
                    project: 'Project Beta'
                }
            ]
        },
        {
            id: 'IC001',
            name: 'ARM Cortex-M4 MCU',
            manufacturer: 'STMicroelectronics',
            partNumber: 'STM32F411CEU6',
            description: 'ARM Cortex-M4 32-bit MCU, 512KB Flash, 128KB SRAM',
            quantity: 45,
            location: 'B1-A3',
            unitPrice: 706,
            datasheetLink: 'https://www.st.com/stm32f411',
            category: 'Microcontrollers',
            criticalLowThreshold: 20,
            lastUpdated: new Date('2024-01-25'),
            addedDate: new Date('2023-09-01'),
            movements: [
                {
                    id: 'M005',
                    type: 'inward',
                    quantity: 100,
                    user: 'Admin',
                    date: new Date('2023-09-01'),
                    reason: 'New project procurement',
                    project: 'General Stock'
                },
                {
                    id: 'M006',
                    type: 'outward',
                    quantity: 55,
                    user: 'Engineer C',
                    date: new Date('2024-01-25'),
                    reason: 'Production batch',
                    project: 'Project Gamma'
                }
            ]
        },
        {
            id: 'L001',
            name: 'Inductor 10µH',
            manufacturer: 'Coilcraft',
            partNumber: 'LPS3314-103MRC',
            description: '10µH ±20% 1.7A SMD Power Inductor',
            quantity: 200,
            location: 'A3-C1',
            unitPrice: 104,
            datasheetLink: 'https://www.coilcraft.com/inductors',
            category: 'Passive Components',
            criticalLowThreshold: 30,
            lastUpdated: new Date('2024-01-10'),
            addedDate: new Date('2023-11-20'),
            movements: [
                {
                    id: 'M007',
                    type: 'inward',
                    quantity: 250,
                    user: 'Lab Tech 1',
                    date: new Date('2023-11-20'),
                    reason: 'Quarterly procurement',
                    project: 'General Stock'
                },
                {
                    id: 'M008',
                    type: 'outward',
                    quantity: 50,
                    user: 'Engineer D',
                    date: new Date('2024-01-10'),
                    reason: 'R&D testing',
                    project: 'Project Delta'
                }
            ]
        },
        {
            id: 'D001',
            name: 'Schottky Diode',
            manufacturer: 'Vishay',
            partNumber: 'PMEG3010EP',
            description: '30V 1A Schottky Barrier Rectifier SOD-323',
            quantity: 15,
            location: 'B2-A2',
            unitPrice: 29,
            datasheetLink: 'https://www.vishay.com/diodes',
            category: 'Semiconductors',
            criticalLowThreshold: 25,
            lastUpdated: new Date('2024-01-22'),
            addedDate: new Date('2023-06-15'),
            movements: [
                {
                    id: 'M009',
                    type: 'inward',
                    quantity: 500,
                    user: 'Lab Tech 3',
                    date: new Date('2023-06-15'),
                    reason: 'Annual procurement',
                    project: 'General Stock'
                },
                {
                    id: 'M010',
                    type: 'outward',
                    quantity: 485,
                    user: 'Engineer E',
                    date: new Date('2024-01-22'),
                    reason: 'Mass production',
                    project: 'Project Epsilon'
                }
            ]
        },
        {
            id: 'T001',
            name: 'NPN Transistor',
            manufacturer: 'ON Semiconductor',
            partNumber: 'MMBT3904',
            description: 'NPN Bipolar Transistor 40V 200mA SOT-23',
            quantity: 180,
            location: 'C1-B3',
            unitPrice: 15,
            datasheetLink: 'https://www.onsemi.com/transistors',
            category: 'Semiconductors',
            criticalLowThreshold: 40,
            lastUpdated: new Date('2024-01-05'),
            addedDate: new Date('2023-12-01'),
            movements: [
                {
                    id: 'M011',
                    type: 'inward',
                    quantity: 300,
                    user: 'Lab Tech 2',
                    date: new Date('2023-12-01'),
                    reason: 'End of year stock',
                    project: 'General Stock'
                },
                {
                    id: 'M012',
                    type: 'outward',
                    quantity: 120,
                    user: 'Researcher F',
                    date: new Date('2024-01-05'),
                    reason: 'Circuit prototyping',
                    project: 'Project Zeta'
                }
            ]
        },
        {
            id: 'Q001',
            name: 'Crystal Oscillator 16MHz',
            manufacturer: 'Abracon',
            partNumber: 'ABM8G-16.000MHZ-4Y-T3',
            description: '16MHz ±20ppm Crystal Oscillator SMD',
            quantity: 85,
            location: 'C2-A1',
            unitPrice: 79,
            datasheetLink: 'https://www.abracon.com/crystals',
            category: 'Timing Components',
            criticalLowThreshold: 15,
            lastUpdated: new Date('2024-01-18'),
            addedDate: new Date('2023-08-20'),
            movements: [
                {
                    id: 'M013',
                    type: 'inward',
                    quantity: 150,
                    user: 'Admin',
                    date: new Date('2023-08-20'),
                    reason: 'Project specific order',
                    project: 'General Stock'
                },
                {
                    id: 'M014',
                    type: 'outward',
                    quantity: 65,
                    user: 'Engineer G',
                    date: new Date('2024-01-18'),
                    reason: 'PCB assembly',
                    project: 'Project Eta'
                }
            ]
        },
        {
            id: 'S001',
            name: 'Temperature Sensor',
            manufacturer: 'Texas Instruments',
            partNumber: 'LM75BIM-3',
            description: 'Digital Temperature Sensor ±2°C I2C SOIC-8',
            quantity: 32,
            location: 'D1-B1',
            unitPrice: 174,
            datasheetLink: 'https://www.ti.com/sensors',
            category: 'Sensors',
            criticalLowThreshold: 10,
            lastUpdated: new Date('2024-01-28'),
            addedDate: new Date('2023-09-10'),
            movements: [
                {
                    id: 'M015',
                    type: 'inward',
                    quantity: 50,
                    user: 'Lab Tech 1',
                    date: new Date('2023-09-10'),
                    reason: 'Sensor project',
                    project: 'General Stock'
                },
                {
                    id: 'M016',
                    type: 'outward',
                    quantity: 18,
                    user: 'Engineer H',
                    date: new Date('2024-01-28'),
                    reason: 'Environmental monitoring',
                    project: 'Project Theta'
                }
            ]
        },
        {
            id: 'E001',
            name: 'EEPROM 24LC256',
            manufacturer: 'Microchip',
            partNumber: '24LC256-I/SN',
            description: '256Kbit I2C Serial EEPROM SOIC-8',
            quantity: 12,
            location: 'D2-C2',
            unitPrice: 154,
            datasheetLink: 'https://www.microchip.com/eeprom',
            category: 'Memory',
            criticalLowThreshold: 20,
            lastUpdated: new Date('2024-01-30'),
            addedDate: new Date('2023-05-25'),
            movements: [
                {
                    id: 'M017',
                    type: 'inward',
                    quantity: 100,
                    user: 'Lab Tech 3',
                    date: new Date('2023-05-25'),
                    reason: 'Memory upgrade project',
                    project: 'General Stock'
                },
                {
                    id: 'M018',
                    type: 'outward',
                    quantity: 88,
                    user: 'Researcher I',
                    date: new Date('2024-01-30'),
                    reason: 'Data logging system',
                    project: 'Project Iota'
                }
            ]
        },
        {
            id: 'P001',
            name: 'Power MOSFET',
            manufacturer: 'Infineon',
            partNumber: 'IRF540NPBF',
            description: 'N-Channel Power MOSFET 100V 33A TO-220',
            quantity: 28,
            location: 'E1-A2',
            unitPrice: 266,
            datasheetLink: 'https://www.infineon.com/mosfets',
            category: 'Semiconductors',
            criticalLowThreshold: 15,
            lastUpdated: new Date('2024-01-12'),
            addedDate: new Date('2023-11-05'),
            movements: [
                {
                    id: 'M019',
                    type: 'inward',
                    quantity: 50,
                    user: 'Admin',
                    date: new Date('2023-11-05'),
                    reason: 'Power electronics project',
                    project: 'General Stock'
                },
                {
                    id: 'M020',
                    type: 'outward',
                    quantity: 22,
                    user: 'Engineer J',
                    date: new Date('2024-01-12'),
                    reason: 'Motor control system',
                    project: 'Project Kappa'
                }
            ]
        }
    ],

    // Statistics for dashboard
    stats: {
        totalComponents: 10,
        totalQuantity: 2000,
        lowStockItems: 4,
        oldStockItems: 3,
        totalValue: 92459,
        monthlyInward: 850,
        monthlyOutward: 680
    },

    // Chart data
    chartData: {
        monthlyInward: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            data: [120, 150, 180, 140, 200, 170]
        },
        monthlyOutward: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            data: [100, 130, 160, 120, 180, 150]
        },
        categoryDistribution: {
            labels: ['Passive Components', 'Semiconductors', 'Microcontrollers', 'Sensors', 'Memory'],
            data: [4, 3, 1, 1, 1]
        }
    },

    // Sample notifications
    notifications: [
        {
            id: 'N001',
            type: 'warning',
            title: 'Low Stock Alert',
            message: 'Resistor 10kΩ (RC0603FR-0710KL) is running low (25 remaining)',
            date: new Date(),
            read: false,
            component: 'R001'
        },
        {
            id: 'N002',
            type: 'warning',
            title: 'Low Stock Alert',
            message: 'Schottky Diode (PMEG3010EP) is below critical threshold (15 remaining)',
            date: new Date(Date.now() - 86400000),
            read: false,
            component: 'D001'
        },
        {
            id: 'N003',
            type: 'info',
            title: 'Old Stock Notice',
            message: 'Resistor 10kΩ (RC0603FR-0710KL) has been in stock for over 3 months without movement',
            date: new Date(Date.now() - 172800000),
            read: true,
            component: 'R001'
        }
    ]
};

// Initialize data in localStorage if not exists
if (!localStorage.getItem('inventoryComponents')) {
    localStorage.setItem('inventoryComponents', JSON.stringify(mockData.components));
}

if (!localStorage.getItem('inventoryStats')) {
    localStorage.setItem('inventoryStats', JSON.stringify(mockData.stats));
}

if (!localStorage.getItem('inventoryNotifications')) {
    localStorage.setItem('inventoryNotifications', JSON.stringify(mockData.notifications));
}

// Export mock data
window.mockData = mockData;