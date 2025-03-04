<template>
  <div>
    <p><strong>Публичный ключ:</strong> {{ publicKey }}</p>
    <p><strong>Приватный ключ:</strong> {{ privateKey }}</p>
  </div>
</template>

<script>
export default {
  name: 'WalletKeys',
  props: {
    publicKey: {
      type: String,
      required: true,
    },
    privateKey: {
      type: String,
      required: true,
    },
  },
};
</script>

<style scoped>
/* Стили для ключей, если нужно */
</style>