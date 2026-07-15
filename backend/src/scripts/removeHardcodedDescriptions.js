/**
 * Script to remove hardcoded Instagram Flag description from all services
 * Run with: node src/scripts/removeHardcodedDescriptions.js
 */

const { db } = require('../config/firebaseAdmin');

const HARDCODED_TEXT = '🚫 Important: Instagram Flag Must Be Off!';

async function removeHardcodedDescriptions() {
  try {
    console.log('🔍 Fetching all services...');
    const servicesSnapshot = await db.collection('services').get();
    
    if (servicesSnapshot.empty) {
      console.log('❌ No services found in database.');
      return;
    }

    console.log(`📦 Found ${servicesSnapshot.size} services. Checking for hardcoded descriptions...`);

    let updatedCount = 0;
    const batch = db.batch();

    servicesSnapshot.forEach((doc) => {
      const data = doc.data();
      const description = data.description || '';

      // Check if this service has the hardcoded Instagram Flag description
      if (description.includes(HARDCODED_TEXT)) {
        console.log(`\n🔧 Updating service: ${doc.id} - ${data.name}`);
        console.log(`   Current description length: ${description.length} characters`);
        
        // Update to empty description
        batch.update(doc.ref, {
          description: '',
          updatedAt: new Date()
        });
        
        updatedCount++;
      }
    });

    if (updatedCount === 0) {
      console.log('\n✅ No services with hardcoded descriptions found. All clean!');
      process.exit(0);
      return;
    }

    console.log(`\n⏳ Updating ${updatedCount} service(s)...`);
    await batch.commit();
    
    console.log(`\n✅ Successfully removed hardcoded descriptions from ${updatedCount} service(s)!`);
    console.log('💡 Tip: Admins can now add custom descriptions for each service.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing hardcoded descriptions:', error);
    process.exit(1);
  }
}

// Run the script
removeHardcodedDescriptions();
