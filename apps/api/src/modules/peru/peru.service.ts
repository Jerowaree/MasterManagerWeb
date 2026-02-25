import { Injectable } from '@nestjs/common';

@Injectable()
export class PeruService {
  validateRUC(ruc: string): boolean {
    if (!ruc || ruc.length !== 11) return false;
    // Basic RUC validation logic for Peru
    const prefixes = ['10', '15', '17', '20'];
    if (!prefixes.includes(ruc.substring(0, 2))) return false;
    
    return true; // Simplified for now
  }

  calculateIGV(amount: number): number {
    const IGV_RATE = 0.18;
    return amount * IGV_RATE;
  }
}
