// Customer module type definitions
export interface CreateCustomerBody {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface UpdateCustomerDebtBody {
  total: number;
  customerId: string;
  note: string;
}

export interface CustomerParams {
  id: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
}

export interface CustomerTransaction {
  amount: number;
  date: Date;
  note: string;
  performedBy: string;
}

export interface CustomerResponse {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  debt: number;
  transactions: CustomerTransaction[];
  createdAt: Date;
  updatedAt: Date;
}
