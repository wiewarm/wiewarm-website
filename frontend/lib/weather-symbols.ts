export type WeatherKind = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'thunder';

// MeteoSwiss daytime pictogram numbers (jp2000d0). The graphics are proprietary, so only numbers and texts are used.
const SYMBOLS: Record<number, [WeatherKind, string]> = {
  1: ['sun', 'sonnig'],
  2: ['partly', 'ziemlich sonnig'],
  3: ['partly', 'teilweise sonnig'],
  4: ['cloud', 'wechselnd bewölkt'],
  5: ['cloud', 'bedeckt'],
  6: ['rain', 'Aufhellungen, einzelne Regenschauer'],
  7: ['snow', 'Aufhellungen, einzelne Regen- oder Schneeschauer'],
  8: ['snow', 'Aufhellungen, einzelne Schneeschauer'],
  9: ['rain', 'bewölkt, einige Regenschauer'],
  10: ['snow', 'bewölkt, einige Regen- oder Schneeschauer'],
  11: ['snow', 'bewölkt, einige Schneeschauer'],
  12: ['thunder', 'Aufhellungen, leicht gewitterhaft'],
  13: ['thunder', 'Aufhellungen und gewitterhaft'],
  14: ['rain', 'stark bewölkt, schwacher Regen'],
  15: ['snow', 'stark bewölkt, schwacher Schnee oder Regen'],
  16: ['snow', 'stark bewölkt, schwacher Schnee'],
  17: ['rain', 'stark bewölkt, zeitweise Regen'],
  18: ['snow', 'stark bewölkt, zeitweise Schnee oder Regen'],
  19: ['snow', 'stark bewölkt, zeitweise Schnee'],
  20: ['rain', 'stark bewölkt, anhaltender Regen'],
  21: ['snow', 'stark bewölkt, anhaltender Regen oder Schnee'],
  22: ['snow', 'stark bewölkt, anhaltender Schnee'],
  23: ['thunder', 'stark bewölkt, leicht gewitterhaft'],
  24: ['thunder', 'stark bewölkt, gewitterhaft'],
  25: ['thunder', 'stark bewölkt, stark gewitterhaft'],
  26: ['partly', 'Hohe Bewölkung'],
  27: ['fog', 'Hochnebel'],
  28: ['fog', 'Nebel'],
  29: ['rain', 'leicht bewölkt, einzelne Regenschauer'],
  30: ['snow', 'leicht bewölkt, leichter Schneefall'],
  31: ['snow', 'teilweise sonnig, einige Schnee- oder Regenschauer'],
  32: ['rain', 'teilweise sonnig, einige Regenschauer'],
  33: ['rain', 'bewölkt, häufige Regenschauer'],
  34: ['snow', 'bewölkt, häufige Schneeschauer'],
  35: ['cloud', 'bedeckt und trocken'],
  36: ['thunder', 'teilweise sonnig, gewitterhaft'],
  37: ['thunder', 'teilweise sonnig, Gewitter und Schneeschauer'],
  38: ['thunder', 'bewölkt, Gewitter und häufige Regenschauer'],
  39: ['thunder', 'bewölkt, Gewitter und häufige Schneeschauer'],
  40: ['thunder', 'stark bewölkt, leicht gewitterhaft'],
  41: ['thunder', 'bewölkt, leicht gewitterhaft'],
  42: ['thunder', 'stark bewölkt, Gewitter und häufige Schneeschauer'],
};

export function describeWeatherSymbol(symbol: number | null): { kind: WeatherKind; label: string } | null {
  const entry = symbol === null ? undefined : SYMBOLS[symbol];
  return entry ? { kind: entry[0], label: entry[1] } : null;
}
