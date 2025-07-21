// Invoice module type definitions
export interface InvoiceItem {
  productId: string;
  quantity: number;
}

export interface CreateInvoiceBody {
  customerId: string;
  items: InvoiceItem[];
}

export interface InvoiceItemResponse {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceResponse {
  _id: string;
  customerName: string;
  items: InvoiceItemResponse[];
  totalAmount: number;
  issuedBy: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
