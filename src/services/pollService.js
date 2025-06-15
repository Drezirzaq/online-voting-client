import axios from "axios";
const API_BASE_URL = "https://192.168.1.87:5000/api/poll";

export async function getPolls() {
  try {
    const response = await axios.get(`${API_BASE_URL}/polls`);
    return response.data;
  } catch (error) {
    throw new Error(`Ошибка при отправке транзакции: ${error}`);
  }
}

export async function getPollDetails(request) {
  try {
    const response = await axios.post(`${API_BASE_URL}/poll-details`, request);
    return response.data;
  } catch (error) {
    throw new Error(`Ошибка при отправке транзакции: ${error}`);
  }
}
