/**
 * Script to create initial stats counter document
 * Run this once: node src/scripts/createStatsCounter.js
 */

const { admin, db } = require('../config/firebaseAdmin');

async function createStatsCounter() {
  try {
    console.log('🔄 Fetching current data...');

    // Count users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    // Count orders
    const ordersSnapshot = await db.collection('orders').get();
    const totalOrders = ordersSnapshot.size;

    // Count services
    const servicesSnapshot = await db.collection('services').get();
    const totalServices = servicesSnapshot.size;

    // Count online users (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    let onlineUsers = 0;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const lastSeen = userData.lastSeen?.toMillis?.() || userData.lastSeen || 0;
      if (lastSeen > fiveMinutesAgo) {
        onlineUsers++;
      }
    });

    // Create stats document
    const statsData = {
      totalUsers,
      totalOrders,
      totalServices,
      onlineUsers,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('stats').doc('counters').set(statsData, { merge: true });

    console.log('✅ Stats counter created successfully!');
    console.log('📊 Stats:', statsData);
    console.log('\n📝 Next steps:');
    console.log('1. Update user registration to increment totalUsers');
    console.log('2. Update order creation to increment totalOrders');
    console.log('3. Update service creation to increment totalServices');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating stats counter:', error);
    process.exit(1);
  }
}

createStatsCounter();
