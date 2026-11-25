import * as Network from 'expo-network';

/** True when the phone looks connected to the internet. If it cannot tell, it assumes yes and lets the request decide. */
export async function isOnline(): Promise<boolean> {
  try {
    const s = await Network.getNetworkStateAsync();
    return s.isConnected !== false && s.isInternetReachable !== false;
  } catch {
    return true;
  }
}
