<template>
  <div class="create-wallet">
    <h1>Создание кошелька</h1>

    <input
      v-model="password"
      type="password"
      placeholder="Введите пароль"
      @keyup.enter="createWalletHandler"
    />

    <button :disabled="loading || !password" @click="createWalletHandler">
      <span v-if="loading">Создаём…</span>
      <span v-else>Создать кошелёк</span>
    </button>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useWalletStore } from "../services/walletStore";
import { createWallet } from "../services/walletService";

const password = ref("");
const loading = ref(false);
const error = ref(null);

const router = useRouter();
const walletStore = useWalletStore();

async function createWalletHandler() {
  if (!password.value) {
    error.value = "Пароль не может быть пустым";
    return;
  }
  loading.value = true;
  error.value = null;

  try {
    const wallet = await createWallet(password.value);
    walletStore.setCredentials(wallet.address, password.value);
    router.push("/personal-account");
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err ? err.message : null;
    error.value = message || "Не удалось создать кошелёк. Попробуйте ещё раз.";
  } finally {
    loading.value = false;
  }
}
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

button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

button:hover:enabled {
  background-color: #3aa876;
}

.error {
  margin-top: 1rem;
  color: #e63946;
}
</style>
