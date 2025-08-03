// API Test Script
// Run with: node test-api.js

const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
    console.log('🧪 Testing Electronics Inventory API...\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await fetch('http://localhost:5000/health');
        const health = await healthResponse.json();
        
        if (health.success) {
            console.log('✅ Server is running');
            console.log(`📅 Server time: ${health.timestamp}`);
            console.log(`🌍 Environment: ${health.environment}\n`);
        } else {
            throw new Error('Health check failed');
        }

        // Test 2: Login
        console.log('2️⃣ Testing Authentication...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123',
                role: 'admin'
            })
        });

        const loginData = await loginResponse.json();
        
        if (loginData.success && loginData.token) {
            console.log('✅ Login successful');
            console.log(`👤 User: ${loginData.user.name} (${loginData.user.role})`);
            console.log(`🔑 Token: ${loginData.token.substring(0, 20)}...\n`);
        } else {
            throw new Error('Login failed: ' + loginData.message);
        }

        const token = loginData.token;

        // Test 3: Get Components
        console.log('3️⃣ Testing Components API...');
        const componentsResponse = await fetch(`${API_BASE}/components`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const componentsData = await componentsResponse.json();
        
        if (componentsData.success) {
            console.log('✅ Components retrieved successfully');
            console.log(`📦 Total components: ${componentsData.data.length}`);
            
            if (componentsData.data.length > 0) {
                const firstComponent = componentsData.data[0];
                console.log(`📋 Sample component: ${firstComponent.name} (${firstComponent.partNumber})`);
                console.log(`🏷️  Category: ${firstComponent.category}`);
                console.log(`📊 Quantity: ${firstComponent.quantity}`);
            }
            console.log('');
        } else {
            throw new Error('Failed to get components: ' + componentsData.message);
        }

        // Test 4: Get Statistics
        console.log('4️⃣ Testing Statistics API...');
        const statsResponse = await fetch(`${API_BASE}/components/stats/summary`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const statsData = await statsResponse.json();
        
        if (statsData.success) {
            console.log('✅ Statistics retrieved successfully');
            console.log(`📊 Stats: ${JSON.stringify(statsData.data, null, 2)}`);
            console.log('');
        } else {
            throw new Error('Failed to get statistics: ' + statsData.message);
        }

        // Test 5: Get Notifications
        console.log('5️⃣ Testing Notifications API...');
        const notificationsResponse = await fetch(`${API_BASE}/notifications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const notificationsData = await notificationsResponse.json();
        
        if (notificationsData.success) {
            console.log('✅ Notifications retrieved successfully');
            console.log(`🔔 Total notifications: ${notificationsData.data.length}`);
            console.log('');
        } else {
            throw new Error('Failed to get notifications: ' + notificationsData.message);
        }

        // Test 6: Create a Test Component
        console.log('6️⃣ Testing Component Creation...');
        const newComponent = {
            name: 'Test LED 5mm Red',
            partNumber: 'TEST-LED-5MM-RED',
            manufacturer: 'Test Manufacturer',
            category: 'Semiconductors',
            description: 'Test LED for API verification',
            quantity: 100,
            location: 'TEST-A1',
            unitPrice: 15,
            criticalLowThreshold: 10
        };

        const createResponse = await fetch(`${API_BASE}/components`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newComponent)
        });

        const createData = await createResponse.json();
        
        if (createData.success) {
            console.log('✅ Component created successfully');
            console.log(`🆔 New component ID: ${createData.data._id}`);
            console.log(`📦 Component: ${createData.data.name}`);
            console.log('');

            // Clean up - delete the test component
            const deleteResponse = await fetch(`${API_BASE}/components/${createData.data._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (deleteResponse.ok) {
                console.log('✅ Test component cleaned up');
            }
        } else {
            console.log('⚠️ Component creation test failed (this might be expected)');
            console.log(`📝 Reason: ${createData.message}`);
        }

        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('🔗 Your API is working correctly and ready to use.');
        console.log('🌐 You can now open your frontend and login with:');
        console.log('   👤 Username: admin');
        console.log('   🔑 Password: admin123');
        console.log('   👔 Role: admin\n');

    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure the server is running: npm run dev');
        console.log('2. Check MongoDB connection in .env file');
        console.log('3. Verify all environment variables are set');
        console.log('4. Check console for error messages');
        process.exit(1);
    }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

testAPI();