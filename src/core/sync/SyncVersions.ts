export type SyncVersions = {
  settingsVersion: number;
  productsVersion: number;
  inventoryVersion: number;
  employeesVersion: number;
  promotionsVersion: number;
  activityVersion: number;
};

export const DEFAULT_SYNC_VERSIONS: SyncVersions = {
  settingsVersion: 0,
  productsVersion: 0,
  inventoryVersion: 0,
  employeesVersion: 0,
  promotionsVersion: 0,
  activityVersion: 0,
};

export function mergeSyncVersions(
  local: SyncVersions,
  remote: Partial<SyncVersions>,
): SyncVersions {
  return {
    settingsVersion: remote.settingsVersion ?? local.settingsVersion,
    productsVersion: remote.productsVersion ?? local.productsVersion,
    inventoryVersion: remote.inventoryVersion ?? local.inventoryVersion,
    employeesVersion: remote.employeesVersion ?? local.employeesVersion,
    promotionsVersion: remote.promotionsVersion ?? local.promotionsVersion,
    activityVersion: remote.activityVersion ?? local.activityVersion,
  };
}
