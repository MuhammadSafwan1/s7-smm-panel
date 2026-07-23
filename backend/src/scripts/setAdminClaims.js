/**
 * Script to set admin custom claims for users
 * Run this once to set admin privileges for your admin accounts
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Admin emails to set custom claims
const adminEmails = [
  'ms8347750@gmail.com',
  'ms4746845@gmail.com'
];

async function setAdminClaims() {
  try {
    console.log('🔧 Setting admin custom claims...\n');

    for (const email of adminEmails) {
      try {
        // Get user by email
        const user = await admin.auth().getUserByEmail(email);
        
        // Set custom claims
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        
        console.log(`✅ Admin claims set for: ${email} (UID: ${user.uid})`);
        
        // Also update Firestore user document
        await admin.firestore().collection('users').doc(user.uid).update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Firestore role updated for: ${email}\n`);
      } catch (error) {
        console.error(`❌ Error setting claims for ${email}:`, error.message, '\n');
      }
    }

    console.log('🎉 Admin claims setup complete!');
    console.log('\n⚠️  IMPORTANT: Users need to log out and log back in for claims to take effect.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

setAdminClaims();
