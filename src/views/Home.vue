<template>
  <div class="home">
    <h1>Добро пожаловать!</h1>
    <div class="options">
      <button @click="goToCreateWallet">Создать кошелек</button>
      <button @click="goToAuth">Авторизоваться</button>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router';

export default {
  name: 'HomePage',
  setup() {
    const router = useRouter();

    const goToCreateWallet = () => {
      router.push('/create-wallet');
    };

    const goToAuth = () => {
      router.push('/auth');
    };

    return { goToCreateWallet, goToAuth };
  },
};
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

.options {
  display: flex;
  gap: 20px;
  margin-top: 20px;
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