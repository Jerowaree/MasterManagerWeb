import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaService } from './prisma.service';
import { tenantStorage } from '../../common/store/tenant.store';

describe('PrismaService Multi-tenancy', () => {
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = new PrismaService();
    vi.restoreAllMocks();
  });

  it('should block access to tenant models when no companyId is present and context is not public', async () => {
    // We expect an error when attempting to access a tenant model (e.g., User) without context
    await expect(prismaService.client.user.findMany()).rejects.toThrow(
      'Data Leakage Prevention: Attempted to access User without companyId context.'
    );
  });

  it('should allow access to tenant models when companyId is present in context', async () => {
    const mockCompanyId = 'bcc56c80-ee3d-4f40-af60-e97619fcbdb8';
    
    // Use tenantStorage to simulate a request context
    await tenantStorage.run({ companyId: mockCompanyId }, async () => {
      // This should NOT throw the data leakage error. 
      // It might fail for other reasons (e.g., no DB connection), but we check the specific leakage message.
      try {
        await prismaService.client.user.findMany();
      } catch (error: any) {
        expect(error.message).not.toContain('Data Leakage Prevention');
      }
    });
  });

  it('should allow access to tenant models when context is public', async () => {
    await tenantStorage.run({ isPublic: true }, async () => {
      try {
        await prismaService.client.user.findMany();
      } catch (error: any) {
        expect(error.message).not.toContain('Data Leakage Prevention');
      }
    });
  });
});
