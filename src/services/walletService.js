import CryptoJS from "crypto-js";
import axios from "axios";
import { useWalletStore } from "./walletStore";
const API_BASE_URL = "https://192.168.1.87:5000/api";

export async function sendTransaction(path, transaction) {
  try {
    const response = await axios.post(`${API_BASE_URL}/${path}`, transaction);
    return response;
  } catch (error) {
    throw new Error(error.data);
  }
}
export async function getAddresses() {
  try {
    const response = await axios.get(`${API_BASE_URL}/wallet/addresses`);
    return response;
  } catch (error) {
    throw new Error(`Ошибка при попытке получить адреса: ${error}`);
  }
}

export async function signData(data, privateKeyBase64) {
  const privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(privateKeyBase64),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    true,
    ["sign"]
  );

  const signature = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(data)
  );

  return arrayBufferToBase64(signature);
}

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function getWalletBalance(address) {
  try {
    const response = await axios.get(`${API_BASE_URL}/wallet/balance`, {
      params: { address: address },
    });

    const balance = parseFloat(response.data.balance);

    if (isNaN(balance)) {
      throw new Error("Некорректный формат баланса.");
    }

    return balance;
  } catch (error) {
    console.error("Ошибка при получении баланса:", error);
    throw new Error("Не удалось получить баланс кошелька.");
  }
}

export async function generateKeyPair() {
  let keyPair;
  try {
    keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048, // Длина ключа
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
        hash: { name: "SHA-256" }, // Алгоритм хеширования
      },
      true, // Можно ли экспортировать ключи
      ["sign", "verify"] // Использование ключей
    );
  } catch (e) {
    console.log(e);
  }

  // Экспорт ключей в формате base64
  const publicKey = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKey = await window.crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );
  return {
    publicKey: arrayBufferToBase64(publicKey),
    privateKey: arrayBufferToBase64(privateKey),
  };
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function createWalletAddress(publicKey) {
  console.log(publicKey);
  const hash = CryptoJS.SHA256(publicKey).toString(CryptoJS.enc.Hex);
  return `0x${hash.substring(0, 40)}`;
}

export function encryptData(data, password) {
  return CryptoJS.AES.encrypt(data, password).toString();
}

export function decryptData(encryptedData, password) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, password);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

  if (!decryptedData) {
    throw new Error("Неверный пароль или поврежденные данные.");
  }

  return decryptedData;
}

export async function createWallet(password) {
  const { privateKey, publicKey } = await generateKeyPair();
  const walletStore = useWalletStore();
  const address = createWalletAddress(publicKey);

  try {
    await axios.get(`${API_BASE_URL}/wallet/create`, {
      params: { address: address },
    });
  } catch (error) {
    console.error("Ошибка при создании кошелька:", error);
    throw new Error("Ошибка при создании кошелька.");
  }

  const encryptedPrivateKey = encryptData(privateKey, password);
  const encryptedPublicKey = encryptData(publicKey, password);
  walletStore.setKeys(encryptedPublicKey, encryptedPrivateKey);

  return {
    address,
    encryptedPrivateKey,
    encryptedPublicKey,
  };
}

export function loginWallet(address, password) {
  // Получаем зашифрованные ключи из LocalStorage
  const savedAddress = localStorage.getItem("walletAddress");
  const encryptedPrivateKey = localStorage.getItem("encryptedPrivateKey");
  const encryptedPublicKey = localStorage.getItem("encryptedPublicKey");

  // Проверяем, что данные существуют
  if (!savedAddress || !encryptedPrivateKey || !encryptedPublicKey) {
    throw new Error("Кошелек не найден. Сначала создайте кошелек.");
  }

  if (savedAddress !== address) {
    throw new Error("Адрес кошелька не найден.");
  }

  const privateKey = decryptData(encryptedPrivateKey, password);
  const publicKey = decryptData(encryptedPublicKey, password);

  if (!publicKey || !privateKey) throw new Error("Неверный адрес или пароль.");

  return {
    address,
  };
}
