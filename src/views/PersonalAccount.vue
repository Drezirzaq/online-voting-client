<template>
  <div class="personal-account container">
    <header class="header">
      <h1 class="title">Личный кабинет</h1>

      <div class="wallet-info card">
        <div class="info-item">
          <span class="label">Адрес кошелька</span>
          <span class="value mono address">{{ fullAddress }}</span>
          <button
            class="icon-button copy"
            @click="copyAddress"
            title="Скопировать адрес"
          >
            <i class="fas fa-copy" />
          </button>
        </div>

        <div class="info-item">
          <span class="label">Баланс</span>
          <span class="value">{{ balance }} {{ currencySymbol }}</span>
          <button
            class="icon-button refresh"
            @click="getBalance"
            :disabled="loadingBalance"
            title="Обновить баланс"
          >
            <i
              :class="['fas', loadingBalance ? 'fa-sync fa-spin' : 'fa-sync']"
            />
          </button>
        </div>
      </div>
    </header>

    <section class="transaction-card card">
      <h2 class="section-title"><i class="fas fa-paper-plane" /> Отправить</h2>

      <label class="form-field">
        Адрес получателя
        <input v-model="recipientAddress" placeholder="0x…" class="input" />
      </label>

      <label class="form-field">
        Сумма
        <div class="input-with-suffix">
          <input
            v-model.number="sendAmount"
            type="number"
            min="0"
            step="0.0001"
            placeholder="0.00"
            class="input no-spinner"
          />
          <span class="suffix">{{ currencySymbol }}</span>
        </div>
      </label>

      <button class="primary btn" :disabled="sending" @click="sendTransaction">
        <span v-if="sending">Отправка…</span>
        <span v-else>Отправить</span>
        <i class="fas fa-arrow-right" />
      </button>

      <p v-if="txError" class="error">{{ txError }}</p>
    </section>

    <WalletKeys
      v-if="showKeys"
      :public-key="infoKeys.publicKey"
      :private-key="infoKeys.privateKey"
    />

    <footer class="actions">
      <button class="action-btn" @click="toggleKeys">
        <i :class="['fas', showKeys ? 'fa-eye-slash' : 'fa-key']" />
        {{ showKeys ? "Скрыть ключи" : "Показать ключи" }}
      </button>

      <button class="action-btn" @click="poll">
        <i class="fas fa-vote-yea" />
        Голосование
      </button>

      <button class="action-btn logout" @click="logout">
        <i class="fas fa-sign-out-alt" />
        Выйти
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import WalletKeys from "../components/WalletKeys.vue";
import {
  getWalletBalance,
  sendTransaction as apiSend,
  signData,
} from "../services/walletService";
import { useWalletStore } from "../services/walletStore";

const router = useRouter();
const walletStore = useWalletStore();

const currencySymbol = "CUR";

const infoKeys = ref({ publicKey: "", privateKey: "" });
const showKeys = ref(false);

const balance = ref(0);
const loadingBalance = ref(false);

const recipientAddress = ref("");
const sendAmount = ref(null);
const sending = ref(false);
const txError = ref(null);

// —————————————————————————— Computed
const fullAddress = computed(() => walletStore.credentials.address || "");

// —————————————————————————— Methods
async function getBalance() {
  try {
    loadingBalance.value = true;
    if (!walletStore.credentials.address) {
      router.push("/");
      throw new Error(
        "Адрес кошелька отсутствует, перенаправлен на стартовую страницу"
      );
    }

    balance.value = await getWalletBalance(walletStore.credentials.address);
  } catch (err) {
    console.error(err);
  } finally {
    loadingBalance.value = false;
  }
}

function toggleKeys() {
  if (showKeys.value) {
    showKeys.value = false;
    infoKeys.value = { publicKey: "", privateKey: "" };
    return;
  }
  try {
    const keys = walletStore.getKeyes();
    infoKeys.value = { ...keys };
    showKeys.value = true;
  } catch (err) {
    console.error(err);
  }
}

function copyAddress() {
  if (!walletStore.credentials.address) return;
  navigator.clipboard
    .writeText(walletStore.credentials.address)
    .catch(console.error);
}

function logout() {
  router.push("/");
}

function poll() {
  router.push("/personal-account/polls");
}

async function sendTransaction() {
  if (!recipientAddress.value || !sendAmount.value || sendAmount.value <= 0) {
    txError.value = "Укажите корректные данные";
    return;
  }
  sending.value = true;
  txError.value = null;

  try {
    const keys = walletStore.getKeyes();
    const transactionData = {
      transactionType: 0,
      publicKey: keys.publicKey,
      fromAddress: walletStore.credentials.address,
      signature: "",
      timestamp: new Date().toISOString(),
      toAddress: recipientAddress.value,
      amount: sendAmount.value,
    };

    const rawData = `${transactionData.publicKey}${transactionData.fromAddress}${transactionData.timestamp}${transactionData.toAddress}${transactionData.amount}`;
    transactionData.signature = await signData(rawData, keys.privateKey);

    await apiSend("wallet/transfer", transactionData);

    sendAmount.value = null;
    recipientAddress.value = "";
    await getBalance();
  } catch (err) {
    const serverMsg = err?.response?.data?.message;
    txError.value =
      serverMsg || err?.message || "Не удалось отправить транзакцию";
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  getBalance();
});
</script>

<style scoped>
.container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.card {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.header {
  margin-bottom: 24px;
}

.title {
  color: #333;
  font-size: 32px;
  margin-bottom: 16px;
}

.wallet-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.wallet-info .info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: #f1f1f1;
  padding: 8px 12px;
  border-radius: 5px;
}

.label {
  font-weight: 600;
  color: #333;
}

.value {
  font-family: "Courier New", monospace;
  color: #222;
  flex: 1;
}

.address {
  word-break: break-all;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.form-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  text-align: left;
}

.input,
.input-with-suffix input {
  width: 100%;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 16px;
  box-sizing: border-box;
}

.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield;
}

.input-with-suffix {
  position: relative;
}

.suffix {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #666;
  font-size: 14px;
}

.primary.btn {
  background: #007bff;
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: center;
}

.primary.btn:hover:not(:disabled) {
  background: #0056b3;
}

.primary.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  font-size: 15px;
  font-weight: bold;
  margin-top: 20px;
  margin-bottom: 0px;
}

.actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.action-btn {
  flex: 1;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  padding: 12px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.3s;
}

.action-btn:hover {
  background: #0056b3;
}

.action-btn.logout {
  background: #dc3545;
}

.action-btn.logout:hover {
  background: #c82333;
}
</style>
