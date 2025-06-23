<template>
  <div class="poll-container">
    <h2 class="title">Создание онлайн-голосования</h2>

    <form class="card" @submit.prevent="submitPoll">
      <label class="form-field">
        Название голосования
        <input v-model="pollTitle" placeholder="Введите название" required />
      </label>

      <div class="options-block">
        <label>Варианты</label>
        <div v-for="(option, idx) in options" :key="idx" class="row">
          <input v-model="options[idx]" required placeholder="Вариант ответа" />
          <button
            v-if="options.length > 2"
            type="button"
            class="icon-btn danger small"
            @click="removeOption(idx)"
            title="Удалить вариант"
          >
            ✖
          </button>
        </div>
        <button type="button" class="btn success w100" @click="addOption">
          + Добавить вариант
        </button>
      </div>

      <!-- Приватность -->
      <label class="checkbox-field">
        <input type="checkbox" v-model="isPrivate" @change="onPrivacyChange" />
        <span class="checkbox-label">Закрытое голосование</span>
      </label>

      <!-- Приглашённые -->
      <div v-if="isPrivate" class="invited-block">
        <label>Приглашённые пользователи</label>
        <div v-for="(user, idx) in invitedUsers" :key="idx" class="row">
          <select v-model="invitedUsers[idx]" :required="isPrivate">
            <option disabled value="">Выберите пользователя</option>
            <option
              v-for="addr in allAddresses"
              :key="addr"
              :value="addr"
              :disabled="
                invitedUsers.includes(addr) && invitedUsers[idx] !== addr
              "
            >
              {{ addr }}
            </option>
          </select>
          <button
            type="button"
            class="icon-btn danger small"
            @click="removeUser(idx)"
            title="Удалить пользователя"
          >
            ✖
          </button>
        </div>
        <button type="button" class="btn success w100" @click="addUser">
          + Добавить пользователя
        </button>
      </div>

      <!-- Токены -->
      <label v-if="isPrivate" class="form-field">
        Количество токенов
        <input
          type="number"
          min="0"
          v-model.number="tokenAmount"
          placeholder="0"
          class="no-spinner"
        />
      </label>

      <!-- Submit -->
      <button type="submit" class="btn primary w100" :disabled="loading">
        <span v-if="loading">Создаём…</span>
        <span v-else>Создать голосование</span>
      </button>

      <!-- Сообщения -->
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useWalletStore } from "../services/walletStore";
import {
  sendTransaction,
  signData,
  getAddresses,
} from "../services/walletService";

const router = useRouter();

const pollTitle = ref("");
const options = ref(["", ""]);
const isPrivate = ref(false);
const invitedUsers = ref([""]);
const tokenAmount = ref(0);
const loading = ref(false);
const error = ref(null);
const allAddresses = ref([]);
const walletStore = useWalletStore();

onMounted(async () => {
  try {
    const response = await getAddresses();
    allAddresses.value = response.data;
    if (allAddresses.value.length == 0) router.push("/");
  } catch (e) {
    console.error("Не удалось загрузить адреса", e);
    router.push("/");
  }
});

const addOption = () => options.value.push("");
const removeOption = (i) => {
  if (options.value.length > 2) options.value.splice(i, 1);
};

const addUser = () => invitedUsers.value.push("");
const removeUser = (i) => {
  invitedUsers.value.splice(i, 1);
};

function onPrivacyChange() {
  if (isPrivate.value && invitedUsers.value.length > 0) {
    invitedUsers.value.splice(0, 1);
  }
}

function validate() {
  if (!pollTitle.value.trim()) return "Заполните название голосования";
  if (options.value.some((o) => !o.trim())) return "Заполните все варианты";

  const normalizedOptions = options.value.map((o) => o.trim().toLowerCase());
  const uniqueOptions = new Set(normalizedOptions);
  if (uniqueOptions.size !== normalizedOptions.length) {
    return "Варианты ответа не должны повторяться";
  }

  if (isPrivate.value && invitedUsers.value.some((u) => !u.trim()))
    return "Заполните всех приглашённых пользователей";

  return null;
}

async function submitPoll() {
  const validationMsg = validate();
  if (validationMsg) {
    error.value = validationMsg;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const keys = walletStore.getKeyes();
    const tx = {
      transactionType: 1,
      publicKey: keys.publicKey,
      fromAddress: walletStore.credentials.address,
      signature: "",
      timestamp: new Date().toISOString(),
      pollTitle: pollTitle.value,
      options: options.value,
      isPrivate: isPrivate.value,
      invitedUsers: invitedUsers.value,
      tokensAmount: tokenAmount.value,
    };

    const raw = `${tx.publicKey}${tx.fromAddress}${tx.timestamp}${tx.pollTitle}`;
    tx.signature = await signData(raw, keys.privateKey);

    const response = await sendTransaction("poll/create-poll", tx);

    const pollId = response.data.pollId;
    router.push({ path: `/personal-account/polls/${pollId}` });
  } catch (err) {
    error.value =
      err?.response?.data?.message ||
      err?.message ||
      "Не удалось создать голосование";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.poll-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.title {
  font-size: 24px;
  margin-bottom: 16px;
  color: #333;
}

.card {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  text-align: left;
}

.form-field input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.options-block label {
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
  text-align: left;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.row input,
.row select {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

input.no-spinner::-webkit-outer-spin-button,
input.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input.no-spinner {
  -moz-appearance: textfield;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff !important;
}

.w100 {
  width: 100%;
}

.primary {
  background: #007bff;
}
.primary:hover:not(:disabled) {
  background: #0056b3;
}

.success {
  background: #28a745;
}
.success:hover:not(:disabled) {
  background: #218838;
}

.danger {
  background: #dc3545;
}
.danger:hover:not(:disabled) {
  background: #c82333;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.icon-btn.danger {
  background: #dc3545;
  border-radius: 6px;
}

.icon-btn.danger:hover {
  background: #c82333;
}

.small {
  width: 32px;
  height: 32px;
  font-size: 18px;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  background: #e9ecef;
  padding: 8px 12px;
  border-radius: 6px;
}

.checkbox-label {
  font-weight: 600;
  color: #333;
}

.invited-block label {
  font-weight: 600;
  text-align: left;
  display: block;
  margin-bottom: 6px;
}

.invited-block {
  margin-bottom: 16px;
}

.error {
  color: #dc3545;
  margin-top: 20px;
  margin-bottom: 0px;
  font-weight: bold;
}
.success {
  color: #28a745;
  margin-top: 12px;
  font-weight: bold;
}
</style>
