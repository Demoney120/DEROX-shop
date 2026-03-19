export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'buyer' | 'seller' | 'admin';
  trustScore: number;
  isVerified: boolean;
  onboardingCompleted: boolean;
  subscription?: {
    plan: 'none' | 'weekly' | 'monthly' | 'yearly';
    expiresAt: string;
  };
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  images: string[];
  status: 'active' | 'sold' | 'archived';
  createdAt: string;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'disputed' | 'refunded';
  escrowStatus: 'held' | 'released' | 'refunded';
  createdAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  reason: string;
  aiRecommendation: string;
  status: 'open' | 'resolved' | 'closed';
  createdAt: string;
}
