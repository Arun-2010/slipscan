import AsyncStorage from '@react-native-async-storage/async-storage';
import aesjs from 'aes-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Session storage for Supabase auth: the session is AES-encrypted in AsyncStorage and the
 * key lives in the device keystore (SecureStore). SecureStore alone caps values at 2 KB,
 * which a Supabase session can exceed. This is the pattern Supabase recommends for Expo.
 */
class EncryptedStorage {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = getRandomBytes(32);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const keyHex = await SecureStore.getItemAsync(key);
    if (!keyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch {
      return null; // corrupted or key lost: treat as logged out
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, await this.encrypt(key, value));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

// SecureStore doesn't exist on web; there the browser's storage is the only option.
export const authStorage = Platform.OS === 'web' ? AsyncStorage : new EncryptedStorage();
