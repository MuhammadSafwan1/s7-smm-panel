// Platform Model - Firestore Document Structure
const { Timestamp } = require('firebase-admin/firestore');

class Platform {
  constructor(data) {
    this.name = data.name || '';
    this.slug = data.slug || this.generateSlug(data.name);
    this.logo = data.logo || '';
    this.icon = data.icon || '';
    this.background = data.background || '';
    this.themeColor = data.themeColor || '#000000';
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
      name: this.name,
      slug: this.slug,
      logo: this.logo,
      icon: this.icon,
      background: this.background,
      themeColor: this.themeColor,
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

module.exports = Platform;
