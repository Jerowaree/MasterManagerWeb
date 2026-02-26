import { BadRequestException, Injectable } from '@nestjs/common';

type NominatimItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

@Injectable()
export class GeoService {
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org/search';
  private readonly defaultLimit = 5;
  private readonly maxLimit = 10;

  async searchAddress(query: string, countryCode?: string, limit?: number) {
    const sanitizedQuery = query.trim();
    if (sanitizedQuery.length < 3) {
      throw new BadRequestException('La busqueda debe tener al menos 3 caracteres');
    }

    const finalLimit = Math.min(Math.max(Number(limit ?? this.defaultLimit), 1), this.maxLimit);
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      q: sanitizedQuery,
      limit: String(finalLimit),
    });

    if (countryCode?.trim()) {
      params.set('countrycodes', countryCode.trim().toLowerCase());
    }

    const response = await fetch(`${this.nominatimBaseUrl}?${params.toString()}`, {
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT ?? 'MasterManager/1.0 (support@mastermanager.local)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new BadRequestException('No fue posible consultar direcciones ahora');
    }

    const data = (await response.json()) as NominatimItem[];
    return data.map((item) => ({
      placeId: String(item.place_id),
      displayName: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
    }));
  }
}
