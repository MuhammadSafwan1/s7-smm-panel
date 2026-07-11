'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch {
          localStorage.removeItem('cart');
        }
      }
    }
  }, []);

  // Update localStorage when cart changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    }
    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
    setCartTotal(total);
  }, [cartItems]);

  const addToCart = (account) => {
    setCartItems((prev) => {
      const exists = prev.find((item) => item.id === account.id);
      if (exists) return prev;
      return [...prev, { ...account, addedAt: new Date().toISOString() }];
    });
  };

  const removeFromCart = (accountId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== accountId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const isInCart = (accountId) => {
    return cartItems.some((item) => item.id === accountId);
  };

  const cartCount = cartItems.length;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartTotal,
        cartCount,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;