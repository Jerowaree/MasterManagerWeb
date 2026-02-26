import { SetMetadata } from '@nestjs/common';

export const ALLOWED_COUNTRIES_KEY = 'allowedCountries';

export const AllowedCountries = (...countries: string[]) =>
  SetMetadata(ALLOWED_COUNTRIES_KEY, countries.map((country) => country.trim().toUpperCase()));
