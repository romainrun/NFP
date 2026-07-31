/**
 * Central application configuration.
 * Keep environment-agnostic defaults here; override via Expo Constants later.
 */
export const APP_CONFIG = {
  name: 'NaturallyForme Paiement',
  shortName: 'NFP',
  version: '0.1.0',
  /** Idle timeout before automatic PIN lock (milliseconds). */
  idleLogoutMs: 15 * 60 * 1000,
  /** PIN length accepted by the unlock pad. */
  pinLength: 4,
  /** Tablet layout breakpoint (dp). */
  tabletMinWidth: 768,
  database: {
    name: 'nfp.db',
  },
  secureStorageKeys: {
    sessionToken: 'nfp.session.token',
    themePreference: 'nfp.theme.preference',
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
