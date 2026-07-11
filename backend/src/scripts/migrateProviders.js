/**
 * Migration Script: Move hardcoded providers to Firestore
 * 
 * Run this script ONCE after deploying backend to migrate your existing providers
 * 
 * Usage:
 *   node src/scripts/migrateProviders.js
 */

const { db } = require('../config/firebaseAdmin');
const { Timestamp } = require('firebase-admin/firestore');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const providers = [
  {
    name: 'SMMDecent',
    slug: 'smmdecent',
    apiUrl: process.env.SMMDECENT_API_URL || 'https://smmdecent.co/api/v2',
    apiKey: process.env.SMMDECENT_API_KEY || '',
    type: 'api_v2',
    description: 'Premium SMM services provider',
    website: 'https://smmdecent.co',
    isActive: true,
  },
  {
    name: 'SMMCloud',
    slug: 'smmcloud',
    apiUrl: process.env.SMMCLOUD_API_URL || 'https://smmcloud.uk/api/v2',
    apiKey: process.env.SMMCLOUD_API_KEY || '',
    type: 'api_v2',
    description: 'Reliable SMM panel services',
    website: 'https://smmcloud.uk',
    isActive: true,
  },
];

async function migrateProviders() {
  console.log('🚀 Starting provider migration...\n');
  
  try {
    for (const provider of providers) {
      console.log(`📦 Migrating: ${provider.name}`);
      
      if (!provider.apiKey) {
        console.log(`   ⚠️  Warning: No API key found in .env for ${provider.name}`);
        console.log(`   💡 You can add it manually later in the admin panel\n`);
      }
      
      // Check if provider already exists
      const existingQuery = await db.collection('providers')
        .where('slug', '==', provider.slug)
        .get();
      
      if (!existingQuery.empty) {
        console.log(`   ℹ️  Provider already exists, skipping...\n`);
        continue;
      }
      
      // Add provider to Firestore
      const providerData = {
        ...provider,
        balance: 0,
        currency: 'USD',
        lastSyncedAt: null,
        lastCheckedAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const docRef = await db.collection('providers').add(providerData);
      console.log(`   ✅ Migrated successfully with ID: ${docRef.id}\n`);
    }
    
    console.log('✨ Migration completed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Check your admin panel at /admin/providers');
    console.log('   2. Test provider connections');
    console.log('   3. Sync services from providers');
    console.log('   4. Set profit margins and activate services\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateProviders();
