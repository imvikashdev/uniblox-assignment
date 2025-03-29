import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

const mockAdminService = {
  getActiveDiscountCode: jest.fn(),
  getStatistics: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;
  let service: typeof mockAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActiveDiscount', () => {
    it('should call adminService.getActiveDiscountCode', async () => {
      mockAdminService.getActiveDiscountCode.mockResolvedValue(null);
      await controller.getActiveDiscount();
      expect(service.getActiveDiscountCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('should call adminService.getStatistics', async () => {
      mockAdminService.getStatistics.mockResolvedValue({} as any);
      await controller.getStats();
      expect(service.getStatistics).toHaveBeenCalledTimes(1);
    });
  });
});
