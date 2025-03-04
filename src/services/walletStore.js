import { defineStore } from 'pinia';
import { decryptData } from '../services/walletService';

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    credentials: {
      address: '',
      password: ''
    }
  }),
  actions: {
    setCredentials(address, password) {
      this.credentials.address = address;
      this.credentials.password = password;
    },
    logout() {
      this.credentials = { address: '', password: '' };
    },
    getKeyes() {
      try {
        const password = this.credentials.password;
        if (!password) throw new Error("Пароль не найден!");

        const encryptedPublicKey = localStorage.getItem('encryptedPublicKey');
        const encryptedPrivateKey = localStorage.getItem('encryptedPrivateKey');

        if (!encryptedPublicKey || !encryptedPrivateKey) {
          throw new Error("Ключи не найдены в localStorage!");
        }

        const publicKey = decryptData(encryptedPublicKey, password);
        const privateKey = decryptData(encryptedPrivateKey, password);

        if (!publicKey || !privateKey) throw new Error("Ошибка дешифрования ключей!");

        return { publicKey, privateKey };
      } catch (error) {
        console.error(error.message);
        return null;
      }
    },
    
  },
  persist: {
    enabled: true, 
    strategies: [
      {
        key: 'wallet-store', 
        storage: localStorage, 
      }
    ]
  }
});
