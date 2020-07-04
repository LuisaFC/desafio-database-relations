import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
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
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer ID does not exists.');
    }

    const idProducts = products.map(product => ({ id: product.id }));

    const listProducts = await this.productsRepository.findAllById(idProducts);

    const updateProductBalance: IUpdateProductsQuantityDTO[] = [];

    const productsOrder = products.map(product => {
      const productList = listProducts.find(prod => prod.id === product.id);
      if (!productList) {
        throw new AppError('Products ID not exists.');
      }

      if (productList.quantity < product.quantity) {
        throw new AppError('some products do not have enough balance.');
      }

      updateProductBalance.push({
        id: product.id,
        quantity: productList.quantity - product.quantity,
      });

      return {
        product_id: product.id,
        price: productList.price,
        quantity: product.quantity,
      };
    });

    await this.productsRepository.updateQuantity(updateProductBalance);

    const order = await this.ordersRepository.create({
      customer,
      products: productsOrder,
    });

    return order;
  }
}

export default CreateOrderService;
