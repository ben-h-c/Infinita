export const AU = 149597870.7; // km
export const C_KMS = 299792.458; // speed of light km/s
export const C_AU_S = C_KMS / AU; // c in AU/s ≈ 0.002004
export const YEAR_S = 365.25 * 86400;
export const DAY_S = 86400;

export const SCALE_LEVELS = [
  { name: 'Solar System', unit: 'AU', factor: 1 },
  { name: 'Stellar', unit: 'ly', factor: 63241 },
  { name: 'Galactic', unit: 'kly', factor: 63241000 },
  { name: 'Cosmic', unit: 'Mly', factor: 63241e6 }
];

export const PLANETS = [
  { name:'Mercury', a:0.387, e:0.206, T:0.241, rReal:2439.7, color:0x8c7e6d, inc:7.0, rVis:0.008 },
  { name:'Venus',   a:0.723, e:0.007, T:0.615, rReal:6051.8, color:0xe8cda0, inc:3.4, rVis:0.014 },
  { name:'Earth',   a:1.000, e:0.017, T:1.000, rReal:6371.0, color:0x4499ff, inc:0.0, rVis:0.015 },
  { name:'Mars',    a:1.524, e:0.093, T:1.881, rReal:3389.5, color:0xc1440e, inc:1.9, rVis:0.011 },
  { name:'Jupiter', a:5.203, e:0.048, T:11.86, rReal:69911,  color:0xc8a87a, inc:1.3, rVis:0.055 },
  { name:'Saturn',  a:9.537, e:0.054, T:29.46, rReal:58232,  color:0xead6a6, inc:2.5, rVis:0.045, rings:true },
  { name:'Uranus',  a:19.19, e:0.047, T:84.01, rReal:25362,  color:0x7ec8e3, inc:0.8, rVis:0.028 },
  { name:'Neptune', a:30.07, e:0.009, T:164.8, rReal:24622,  color:0x3f54ba, inc:1.8, rVis:0.026 }
];

export const SUN_RADIUS_VIS = 0.12;
export const SUN_TEMP = 5778;
export const STAR_DATA = [
  { name:'Alpha Centauri', dist:4.37, temp:5790, mag:0.01 },
  { name:'Barnard\'s Star', dist:5.96, temp:3134, mag:9.5 },
  { name:'Sirius', dist:8.60, temp:9940, mag:-1.46 },
  { name:'Procyon', dist:11.46, temp:6530, mag:0.34 },
  { name:'Altair', dist:16.73, temp:7670, mag:0.77 },
  { name:'Vega', dist:25.04, temp:9602, mag:0.03 },
  { name:'Betelgeuse', dist:700, temp:3500, mag:0.5 },
  { name:'Rigel', dist:860, temp:12100, mag:0.13 }
];
