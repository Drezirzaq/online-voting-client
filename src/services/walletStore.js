import { defineStore } from 'pinia';
import { decryptData } from '../services/walletService';

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    credentials: {
      address: '',
      password: ''
    },
    keys: {
      publicKey: '',
      privateKey: ''
    },
    voted: [],
    registred: []
  }),
  actions: {
    setCredentials(address, password) {
      this.credentials.address = address;
      this.credentials.password = password;
    },
    setKeys(publicKey, privateKey){
      this.keys.publicKey = publicKey;
      this.keys.privateKey = privateKey;
    },
    logout() {
      this.credentials = { address: '', password: '' };
    },
    getKeyes() {
      try {
        const password = this.credentials.password;
        if (!password) throw new Error("Пароль не найден!");

        const encryptedPublicKey = this.keys.publicKey;//localStorage.getItem('encryptedPublicKey');
        const encryptedPrivateKey = this.keys.privateKey;//localStorage.getItem('encryptedPrivateKey');

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
