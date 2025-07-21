// Product module type definitions
export interface CreateProductBody {
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  code: string;
  ordered?: number;
}

export interface CreateProductListBody {
  TenHang: string;
  GiaVon: number;
  GiaBan: number;
  TonKho: number;
  KhachDat: number;
  MaHang: string;
}

export interface StockTransactionBody {
  productId: string;
  quantity: number;
  note: string;
}

export interface ProductParams {
  id: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  cost: number;
  stock: number;
  price: number;
}

export interface ProductTransaction {
  type: "IN" | "OUT";
  cusName?: string;
  quantity: number;
  date: Date;
  note: string;
  performedBy?: string;
  timestamp: Date;
}

export interface ProductResponse {
  _id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  ordered: number;
  stock: number;
  sold: number;
  category: string;
  transactions: ProductTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteProductBody {
  productId: string;
}
