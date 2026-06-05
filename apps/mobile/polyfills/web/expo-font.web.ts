export * from '../../node_modules/expo-font/build/Font';
export { useFonts } from '../../node_modules/expo-font/build/FontHooks';

export async function renderToImageAsync(): Promise<{
  uri: string;
  width: number;
  height: number;
}> {
  return { uri: '', width: 0, height: 0 };
}
