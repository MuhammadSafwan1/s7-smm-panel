// Category Model - Firestore Document Structure
const { Timestamp } = require('firebase-admin/firestore');

class Category {
  constructor(data) {
    this.platformId = data.platformId || '';
    this.name = data.name || '';
    this.slug = data.slug || this.generateSlug(data.name);
    this.description = data.description || '';
    this.icon = data.icon || '';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.sortOrder = data.sortOrder || 0;
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
      platformId: this.platformId,
      name: this.name,
      slug: this.slug,
      description: this.description,
      icon: this.icon,
      isActive: this.isActive,
      sortOrder: this.sortOrder,
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
}

module.exports = Category;
