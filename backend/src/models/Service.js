// Service Model - Firestore Document Structure
const { Timestamp } = require('firebase-admin/firestore');

class Service {
  constructor(data) {
    this.platformId = data.platformId || '';
    this.categoryId = data.categoryId || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.provider = data.provider || '';
    this.providerServiceId = data.providerServiceId || '';
    this.providerPrice = parseFloat(data.providerPrice) || 0;
    this.profit = parseFloat(data.profit) || 0;
    this.price = parseFloat(data.price) || (this.providerPrice + this.profit);
    this.minQuantity = parseInt(data.minQuantity) || 10;
    this.maxQuantity = parseInt(data.maxQuantity) || 100000;
    this.avgStartTime = data.avgStartTime || '0-1 hour';
    this.avgDeliveryTime = data.avgDeliveryTime || '1-24 hours';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isPopular = data.isPopular || false;
    this.isFeatured = data.isFeatured || false;
    this.refillSupported = data.refillSupported || false;
    this.cancelSupported = data.cancelSupported || false;
    this.refundSupported = data.refundSupported || false;
    this.refundPercent = parseFloat(data.refundPercent) || 85;
    this.refillDays = parseInt(data.refillDays ?? data.refillPeriodDays) || 0;
    this.sortOrder = parseInt(data.sortOrder) || 0;
    this.createdAt = data.createdAt || Timestamp.now();
    this.updatedAt = Timestamp.now();
  }

  toFirestore() {
    return {
      platformId: this.platformId,
      categoryId: this.categoryId,
      name: this.name,
      description: this.description,
      provider: this.provider,
      providerServiceId: this.providerServiceId,
      providerPrice: this.providerPrice,
      profit: this.profit,
      price: this.price,
      minQuantity: this.minQuantity,
      maxQuantity: this.maxQuantity,
      avgStartTime: this.avgStartTime,
      avgDeliveryTime: this.avgDeliveryTime,
      isActive: this.isActive,
      isPopular: this.isPopular,
      isFeatured: this.isFeatured,
      refillSupported: this.refillSupported,
      cancelSupported: this.cancelSupported,
      refundSupported: this.refundSupported,
      refundPercent: this.refundPercent,
      refillDays: this.refillDays,
      refillPeriodDays: this.refillDays,
      sortOrder: this.sortOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    const refillDays = parseInt(data.refillDays ?? data.refillPeriodDays) || 0;
    return {
      id: doc.id,
      ...data,
      refundPercent: parseFloat(data.refundPercent) || 85,
      refillDays,
      refillPeriodDays: refillDays,
    };
  }
}

module.exports = Service;
