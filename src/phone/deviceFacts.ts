import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import type { DeviceFacts, NetworkKind } from './deviceSupport';

function networkKind(type: Network.NetworkStateType | undefined): NetworkKind {
  switch (type) {
    case Network.NetworkStateType.WIFI:
      return 'wifi';
    case Network.NetworkStateType.CELLULAR:
      return 'cellular';
    case Network.NetworkStateType.NONE:
      return 'none';
    case undefined:
    case Network.NetworkStateType.UNKNOWN:
      return 'unknown';
    default:
      return 'other';
  }
}

/** Read the phone's memory, free space and connection type right now. Anything unreadable comes back as null or "unknown". */
export async function readDeviceFacts(): Promise<DeviceFacts> {
  let free: number | null = null;
  try {
    free = Paths.availableDiskSpace;
  } catch {
    free = null;
  }
  let network: NetworkKind = 'unknown';
  try {
    network = networkKind((await Network.getNetworkStateAsync()).type);
  } catch {
    network = 'unknown';
  }
  return { platform: Platform.OS, totalMemoryBytes: Device.totalMemory ?? null, freeStorageBytes: free, network };
}
