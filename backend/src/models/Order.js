// Order Model - Firestore Document Structure
const { Timestamp } = require('firebase-admin/firestore');

class Order {
  constructor(data) {
    this.userId = data.userId || '';
    this.serviceId = data.serviceId || '';
    this.platformId = data.platformId || '';
    this.categoryId = data.categoryId || '';
    this.provider = data.provider || '';
    this.providerServiceId = data.providerServiceId || '';
    this.providerOrderId = data.providerOrderId || null;
    this.link = data.link || '';
    this.quantity = parseInt(data.quantity) || 0;
    this.charge = parseFloat(data.charge) || 0;
    this.startCount = parseInt(data.startCount) || 0;
    this.remains = parseInt(data.remains) || parseInt(data.quantity) || 0;
    this.status = data.status || 'pending'; // pending, processing, completed, partial, cancelled, refunded, failed, refilling
    this.createdAt = data.createdAt || Timestamp.now();
    this.updatedAt = Timestamp.now();
    this.completedAt = data.completedAt || null;
  }

  toFirestore() {
    return {
      userId: this.userId,
      serviceId: this.serviceId,
      platformId: this.platformId,
      categoryId: this.categoryId,
      provider: this.provider,
      providerServiceId: this.providerServiceId,
      providerOrderId: this.providerOrderId,
      link: this.link,
      quantity: this.quantity,
      charge: this.charge,
      startCount: this.startCount,
      remains: this.remains,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    };
  }

  isCompleted() {
    return ['completed', 'partial', 'cancelled', 'refunded'].includes(this.status);
  }

  canRefill() {
    return this.status === 'completed';
  }

  canCancel() {
    return ['pending', 'processing'].includes(this.status);
  }
}

module.exports = Order;
