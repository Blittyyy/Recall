import type { LocationGeocodedAddress } from 'expo-location';
import * as NativeLocation from '../../node_modules/expo-location/build/index';

type Coords = { latitude: number; longitude: number };

export async function reverseGeocodeAsync({
  latitude,
  longitude,
}: Coords): Promise<LocationGeocodedAddress[]> {
  return [
    {
      city: 'Sample City',
      street: 'Main Street',
      district: 'Downtown',
      region: 'Sample State',
      postalCode: '12345',
      country: 'Sample Country',
      isoCountryCode: 'SC',
      name: `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      streetNumber: '123',
      subregion: null,
      timezone: null,
      formattedAddress: null,
    },
  ];
}

export * from '../../node_modules/expo-location/build/Location';
export * from '../../node_modules/expo-location/build/Location.types';

export default {
  ...NativeLocation,
  reverseGeocodeAsync,
};
