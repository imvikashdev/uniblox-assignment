import { Order } from '@prisma/client';

const mockTxClient = {
  cartItem: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  },
  appState: { upsert: jest.fn() },
  discountCode: {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
  },
  orderItem: { aggregate: jest.fn(), createMany: jest.fn() },
};

type TransactionCallback = (tx: any) => Promise<Order>;

const mockPrismaService = {
  cartItem: { findMany: jest.fn(), deleteMany: jest.fn(), upsert: jest.fn() },
  order: {
    findUnique: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest
    .fn()
    .mockImplementation(
      async (callback: TransactionCallback): Promise<Order> => {
        return await callback(mockTxClient);
      },
    ),
  appState: mockTxClient.appState,
  discountCode: mockTxClient.discountCode,
  orderItem: mockTxClient.orderItem,
};

const resetAllMocks = () => {
  jest.clearAllMocks();

  mockPrismaService.cartItem.findMany.mockReset();
  mockPrismaService.cartItem.deleteMany.mockReset();
  mockPrismaService.cartItem.upsert?.mockReset();
  mockPrismaService.order.findUnique.mockReset();
  mockPrismaService.order.count.mockReset();
  mockPrismaService.order.aggregate.mockReset();
  mockPrismaService.orderItem.aggregate.mockReset();
  mockPrismaService.orderItem.createMany?.mockReset();
  mockPrismaService.discountCode.findFirst.mockReset();
  mockPrismaService.discountCode.findMany.mockReset();
  mockPrismaService.discountCode.update?.mockReset();
  mockPrismaService.discountCode.updateMany?.mockReset();
  mockPrismaService.discountCode.create?.mockReset();
  mockPrismaService.appState.upsert?.mockReset();
  mockPrismaService.$transaction.mockClear();

  mockTxClient.cartItem.deleteMany.mockReset();
  mockTxClient.appState.upsert.mockReset();
  mockTxClient.discountCode.findFirst.mockReset();
  mockTxClient.discountCode.update.mockReset();
  mockTxClient.discountCode.updateMany.mockReset();
  mockTxClient.discountCode.create.mockReset();
  mockTxClient.discountCode.findMany.mockReset();
  mockTxClient.order.create.mockReset();
  mockTxClient.orderItem.createMany.mockReset();
};

const mockUid = {
  rnd: jest.fn().mockReturnValue('TESTCODE'),
};

export { mockPrismaService, resetAllMocks, mockUid, mockTxClient };
