'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getUserOrders,
  getAllOrders,
  createOrder,
  updateOrder,
  getOrder,
} from '@/firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getUserOrders(user.uid);
    if (fetchError) {
      setError(fetchError);
    } else {
      setOrders(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const placeOrder = async (accountId, price) => {
    if (!user) return { success: false, error: 'You must be logged in' };
    const { id, error: orderError } = await createOrder({
      userId: user.uid,
      accountId,
      price,
      status: 'pending',
    });
    if (orderError) return { success: false, error: orderError };
    await fetchOrders();
    return { success: true, id, error: null };
  };

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    placeOrder,
  };
}

export function useAllOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getAllOrders();
    if (fetchError) {
      setError(fetchError);
    } else {
      setOrders(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId, status, deliveryDetails = null) => {
    const updateData = { status };
    if (deliveryDetails) updateData.deliveryDetails = deliveryDetails;
    const { error: updateError } = await updateOrder(orderId, updateData);
    if (updateError) return { success: false, error: updateError };
    await fetchOrders();
    return { success: true, error: null };
  };

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
  };
}

export function useOrder(id) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await getOrder(id);
      if (fetchError) {
        setError(fetchError);
      } else {
        setOrder(data);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [id]);

  return { order, loading, error };
}