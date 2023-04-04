const axios = require("axios");
const mqtt = require("mqtt");

// Replace with your OpenAI API key
const OPENAI_API_KEY = "Your-OpenAI-API-Key";

const http = axios.create({
  baseURL: "https://api.openai.com/v1/chat",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
});

const host = "127.0.0.1";
const port = "1883";
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

const OPTIONS = {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: "emqx",
  password: "public",
  reconnectPeriod: 1000,
};

const connectUrl = `mqtt://${host}:${port}`;
const chatGPTReqTopic = "chatgpt/request";

const client = mqtt.connect(connectUrl, OPTIONS);

client.on("connect", () => {
  console.log(`${host}, Connected`);
  client.subscribe(chatGPTReqTopic, () => {
    console.log(`${host}, Subscribed to topic '${chatGPTReqTopic}'`);
  });
});

client.on("reconnect", () => {
  console.log(`Reconnecting(${host})`);
});

client.on("error", (error) => {
  console.log(`Cannot connect(${host}, `, error);
});

client.on("message", (topic, payload) => {
  console.log("Received Message:", topic, payload.toString());
  genText(payload.toString());
});

const genText = async (prompt) => {
  console.log(prompt);
  try {
    const { data } = await http.post("/completions", {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    if (data.choices && data.choices.length > 0) {
      const { content } = data.choices[0].message;
      console.log(content);
      client.publish("chatgpt/demo", content, { qos: 0, retain: false }, (error) => {
        if (error) {
          console.error(error);
        }
      });
    } else {
      console.log("Empty: No data received.");
    }
  } catch (e) {
    console.log(e);
    console.log("Error: No data received.");
  }
};
