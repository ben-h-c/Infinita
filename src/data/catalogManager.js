// Catalog states: 'idle' | 'loading' | 'loaded' | 'error'
const catalogs = {};

export function ensureLoaded(name, fetchFn, callback) {
  if (!catalogs[name]) {
    catalogs[name] = { state: 'idle', data: null, callbacks: [] };
  }

  const entry = catalogs[name];

  if (entry.state === 'loaded') {
    callback(entry.data);
    return;
  }

  if (entry.state === 'loading') {
    entry.callbacks.push(callback);
    return;
  }

  // idle or error — (re)attempt loading
  entry.state = 'loading';
  entry.callbacks.push(callback);

  fetchFn()
    .then((data) => {
      entry.state = 'loaded';
      entry.data = data;
      const queued = entry.callbacks.splice(0);
      queued.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[catalogManager] callback error for "${name}":`, err);
        }
      });
    })
    .catch((err) => {
      console.error(`[catalogManager] failed to load "${name}":`, err);
      entry.state = 'error';
      const queued = entry.callbacks.splice(0);
      queued.forEach((cb) => {
        try {
          cb([]);
        } catch (cbErr) {
          console.error(`[catalogManager] callback error for "${name}":`, cbErr);
        }
      });
    });
}

export async function fetchGaiaStars() {
  const adqlQuery = `SELECT TOP 200 source_id, ra, dec, parallax, phot_g_mean_mag, bp_rp, teff_gspphot
FROM gaiadr3.gaia_source
WHERE parallax > 10 AND phot_g_mean_mag < 6
ORDER BY phot_g_mean_mag ASC`;

  const endpoint = 'https://gea.esac.esa.int/tap-server/tap/sync';

  try {
    const params = new URLSearchParams({
      REQUEST: 'doQuery',
      LANG: 'ADQL',
      FORMAT: 'json',
      QUERY: adqlQuery
    });

    const resp = await fetch(endpoint, {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(15000)
    });

    if (!resp.ok) {
      console.error(`[catalogManager] Gaia TAP responded with status ${resp.status}`);
      return [];
    }

    const json = await resp.json();
    const metadata = json.metadata || [];
    const rows = json.data || [];

    // Build a column-name to index map
    const colIndex = {};
    metadata.forEach((col, i) => {
      colIndex[col.name] = i;
    });

    return rows.map((row) => {
      const parallax = row[colIndex['parallax']];
      const bpRp = row[colIndex['bp_rp']];
      const teffRaw = row[colIndex['teff_gspphot']];

      const distPC = 1000 / parallax;
      const distLY = distPC * 3.26156;
      const distAU = distLY * 63241;

      // Estimate temperature from bp_rp if teff_gspphot is missing
      let temp = teffRaw;
      if (temp == null && bpRp != null) {
        temp = 4600 * (1 / (0.92 * bpRp + 1.7) + 1 / (0.92 * bpRp + 0.62));
      }

      return {
        ra: row[colIndex['ra']],
        dec: row[colIndex['dec']],
        distLY,
        distAU,
        mag: row[colIndex['phot_g_mean_mag']],
        temp,
        sourceId: row[colIndex['source_id']]
      };
    });
  } catch (err) {
    console.error('[catalogManager] fetchGaiaStars error:', err);
    return [];
  }
}

export async function fetchNearbyGalaxies() {
  const adqlQuery = `SELECT TOP 200 PGC, RAJ2000, DEJ2000, Dist, TType, Bmag
FROM "VII/237/pgc"
WHERE Dist IS NOT NULL AND Dist < 200 AND Bmag IS NOT NULL
ORDER BY Bmag ASC`;

  const endpoint = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync';

  try {
    const params = new URLSearchParams({
      REQUEST: 'doQuery',
      LANG: 'ADQL',
      FORMAT: 'json',
      QUERY: adqlQuery
    });

    const resp = await fetch(endpoint, {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(15000)
    });

    if (!resp.ok) {
      console.error(`[catalogManager] VizieR TAP responded with status ${resp.status}`);
      return [];
    }

    const json = await resp.json();
    const metadata = json.metadata || [];
    const rows = json.data || [];

    // Build a column-name to index map
    const colIndex = {};
    metadata.forEach((col, i) => {
      colIndex[col.name] = i;
    });

    return rows.map((row) => {
      const distMpc = row[colIndex['Dist']];
      const distLY = distMpc * 3.26156e6; // Mpc to LY
      const distAU = distLY * 63241;

      return {
        name: 'PGC' + row[colIndex['PGC']],
        ra: row[colIndex['RAJ2000']],
        dec: row[colIndex['DEJ2000']],
        distLY,
        distAU,
        mag: row[colIndex['Bmag']],
        morphType: row[colIndex['TType']]
      };
    });
  } catch (err) {
    console.error('[catalogManager] fetchNearbyGalaxies error:', err);
    return [];
  }
}
