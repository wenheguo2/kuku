import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChildProfile } from '../../entities/child-profile.entity';
import { ChildOwnershipService } from './child-ownership.service';

describe('ChildOwnershipService', () => {
  const findOne = jest.fn();
  let service: ChildOwnershipService;

  beforeEach(async () => {
    findOne.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        ChildOwnershipService,
        { provide: getRepositoryToken(ChildProfile), useValue: { findOne } },
      ],
    }).compile();
    service = module.get(ChildOwnershipService);
  });

  it('账号拥有 child_id 时返回档案', async () => {
    const child = { id: '7', userId: '3' };
    findOne.mockResolvedValue(child);
    await expect(service.assertOwner('3', '7')).resolves.toBe(child);
    expect(findOne).toHaveBeenCalledWith({ where: { id: '7', userId: '3' } });
  });

  it('跨账号 child_id 统一返回 404，避免泄露存在性', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.assertOwner('3', '8')).rejects.toBeInstanceOf(NotFoundException);
  });
});
