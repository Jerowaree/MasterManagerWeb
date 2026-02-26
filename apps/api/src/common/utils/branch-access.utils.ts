import { ForbiddenException } from '@nestjs/common';

export type ActorContext = {
  companyId: string;
  role: string;
  branchId?: string | null;
};

export function isBranchScopedRole(role: string) {
  return role === 'employee';
}

export function assertActorBranchScope(actor: ActorContext, targetBranchId: string) {
  if (!isBranchScopedRole(actor.role)) {
    return;
  }

  if (!actor.branchId) {
    throw new ForbiddenException('El usuario no tiene una sucursal asignada');
  }

  if (actor.branchId !== targetBranchId) {
    throw new ForbiddenException('No tienes permisos para operar sobre otra sucursal');
  }
}

export function resolveActorBranchFilter(
  actor: ActorContext,
  requestedBranchId?: string,
): string | undefined {
  if (!isBranchScopedRole(actor.role)) {
    return requestedBranchId;
  }

  if (!actor.branchId) {
    throw new ForbiddenException('El usuario no tiene una sucursal asignada');
  }

  if (requestedBranchId && requestedBranchId !== actor.branchId) {
    throw new ForbiddenException('No tienes permisos para operar sobre otra sucursal');
  }

  return actor.branchId;
}
