// Provider Model - Firestore Document Structure
const { Timestamp } = require('firebase-admin/firestore');

class Provider {
  constructor(data) {
    this.name = data.name || '';
    this.slug = data.slug || this.generateSlug(data.name);
    this.apiUrl = data.apiUrl || '';
    this.apiKey = data.apiKey || '';
    this.type = data.type || 'api_v2'; // api_v2, custom, etc.
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.balance = data.balance || 0;
    this.currency = data.currency || 'USD';
    this.description = data.description || '';
    this.website = data.website || '';
    this.supportEmail = data.supportEmail || '';
    this.lastSyncedAt = data.lastSyncedAt || null;
    this.lastCheckedAt = data.lastCheckedAt || null;
    this.createdAt = data.createdAt || Timestamp.now();
    this.updatedAt = Timestamp.now();
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  toFirestore() {
    return {
      name: this.name,
      slug: this.slug,
      apiUrl: this.apiUrl,
      apiKey: this.apiKey,
      type: this.type,
      isActive: this.isActive,
      balance: this.balance,
      currency: this.currency,
      description: this.description,
      website: this.website,
      supportEmail: this.supportEmail,
      lastSyncedAt: this.lastSyncedAt,
      lastCheckedAt: this.lastCheckedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    };
  }

  // Mask API key for security (show only last 4 characters)
  toPublic() {
    const publicData = this.toFirestore();
    if (publicData.apiKey && publicData.apiKey.length > 4) {
      publicData.apiKey = '***' + publicData.apiKey.slice(-4);
    }
    return publicData;
  }
}

module.exports = Provider;
