<template>
  <div class="auth-page">
    <h1>Авторизация</h1>
    <input v-model="address" type="text" placeholder="Введите адрес кошелька" />
    <input v-model="password" type="password" placeholder="Введите пароль" />
    <button @click="login">Войти</button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import { loginWallet } from "../services/walletService";
import { useWalletStore } from "../services/walletStore";
export default {
  name: "AuthPage",
  setup() {
    const walletStore = useWalletStore();
    return {
      walletStore,
    };
  },
  data() {
    return {
      address: "",
      password: "",
      error: "",
    };
  },
  methods: {
    login() {
      this.error = "";
      try {
        const wallet = loginWallet(this.address, this.password);
        console.log("Авторизация успешна:", wallet);
        this.walletStore.setCredentials(this.address, this.password);
        this.$router.push("/personal-account");
      } catch (error) {
        this.error = error.message;
        console.error("Ошибка авторизации:", error.message);
      }
    },
  },
};
</script>

<style scoped>
.auth-page {
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

.error {
  color: red;
  margin-top: 10px;
}
</style>
