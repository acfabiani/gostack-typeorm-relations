import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid customer.');
    }

    const productIds = products.map(item => {
      return { id: item.id };
    });

    const recordProducts = await this.productsRepository.findAllById(
      productIds,
    );

    if (recordProducts.length < products.length) {
      throw new AppError('One or more invalid products.');
    }

    const order_products = [];

    for (let i = 0; i < recordProducts.length; i += 1) {
      const orderProduct = products.find(
        item => item.id === recordProducts[i].id,
      );

      if (orderProduct) {
        if (orderProduct.quantity > recordProducts[i].quantity) {
          throw new AppError('Insufficient product quantity.');
        } else {
          order_products.push({
            product_id: orderProduct.id,
            quantity: orderProduct.quantity,
            price: recordProducts[i].price,
          });

          recordProducts[i].quantity -= orderProduct.quantity;
        }
      }
    }

    const order = await this.ordersRepository.create({
      customer,
      products: order_products,
    });

    await this.productsRepository.updateQuantity(
      recordProducts.map(item => ({ id: item.id, quantity: item.quantity })),
    );

    return order;
  }
}

export default CreateOrderService;
