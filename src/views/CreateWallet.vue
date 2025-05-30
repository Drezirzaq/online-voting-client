<template>
  <div class="create-wallet">
    <h1>Создание кошелька</h1>
    <input v-model="password" type="password" placeholder="Введите пароль" />
    <button @click="createWallet">Создать кошелек</button>
  </div>
</template>

<script>
import { createWallet } from '../services/walletService';
import { useWalletStore } from '../services/walletStore';
export default {
  name: 'CreateWallet',
  setup() {
    const walletStore = useWalletStore();
    return { 
      walletStore
    };
  },
  data() {
    return {
      password: '',
    };
  },
  methods: {
    async createWallet() {
      try {

        const wallet = await createWallet(this.password);
        console.log('Кошелек создан:', wallet.address);
        // this.$router.push({ path: '/personal-account', query: { address: wallet.address, password: this.password } });
        this.walletStore.setCredentials(wallet.address, this.password);
        this.$router.push('/personal-account');
      } catch (error) {
        console.error('Ошибка при создании кошелька:', error.message);
      }
    },
  },
};
</script>

<style scoped>
.create-wallet {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

input {
  margin: 10px 0;
  padding: 10px;
  font-size: 16px;
  width: 300px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  color: #fff;
  background-color: #42b983;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #3aa876;
}
</style>