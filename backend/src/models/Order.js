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
    this.updatedAt = data.updatedAt || Timestamp.now();
    this.completedAt = data.completedAt || null;
    this.refillSupported = data.refillSupported || false;
    this.refillPeriodDays = parseInt(data.refillPeriodDays ?? data.refillDays) || 0;
    this.refundPercent = parseFloat(data.refundPercent) || 85;
    this.refillUsed = data.refillUsed || false;
    this.refillUsedAt = data.refillUsedAt || null;
    this.refillId = data.refillId || null;
    this.refillRequested = data.refillRequested || false;
    this.refillRequestedAt = data.refillRequestedAt || null;
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
      refillSupported: this.refillSupported,
      refillPeriodDays: this.refillPeriodDays,
      refundPercent: this.refundPercent,
      refillUsed: this.refillUsed,
      refillUsedAt: this.refillUsedAt,
      refillId: this.refillId,
      refillRequested: this.refillRequested,
      refillRequestedAt: this.refillRequestedAt,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    const order = new Order(data);
    order.id = doc.id;
    order.refundPercent = parseFloat(data.refundPercent) || order.refundPercent;
    return order;
  }

  isCompleted() {
    return ['completed', 'partial', 'cancelled', 'refunded'].includes(this.status);
  }

  canRefill() {
    if (this.status !== 'completed') return false;
    if (!this.refillSupported) return false;
    if (this.refillUsed) return false;

    const periodDays = parseInt(this.refillPeriodDays || this.refillDays || 0) || 0;
    if (periodDays <= 0) return true;

    const completedTime = this.completedAt?.toDate ? this.completedAt.toDate() : new Date(this.completedAt || this.updatedAt || 0);
    if (!completedTime || isNaN(completedTime.getTime())) return false;

    const expiresAt = new Date(completedTime.getTime() + periodDays * 24 * 60 * 60 * 1000);
    return new Date() < expiresAt;
  }

  canCancel() {
    return ['pending', 'processing'].includes(this.status);
  }
}

module.exports = Order;
