require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Madam Healthy Cafe Bot is running!');
});

const PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// ตั้งค่า Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// -------------------------------------------------------------
// 📌 [คลังความรู้ร้าน] Madam Healthy Cafe (Healthy Cafe)
// -------------------------------------------------------------
const SYSTEM_INSTRUCTION = `
คุณคือแอดมิน AI ตอบแชทลูกค้าของร้าน "Madam Healthy Cafe" คาเฟ่สุขภาพเพื่อคนรักรูปร่างและสุขภาพ
ตอบด้วยคำสุภาพ น่ารัก เป็นกันเอง มีหางเสียง (ค่ะ/นะคะ) สั้นกระชับ ให้ข้อมูลแม่นยำและใส่ใจสุขภาพลูกค้า

[เกี่ยวกับร้าน]
- เราคือ คาเฟ่สุขภาพ (Healthy Cafe) เน้นเครื่องดื่มและขนมเพื่อสุขภาพ สำหรับคนดูแลรูปร่างโดยเฉพาะ
- เวลาทำการ: 08:00 - 18:00 น. (เปิดทุกวัน)

[เมนูเครื่องดื่มสุขภาพ]
1. สมูทตี้โปรตีนปั่น: โปรตีนสูง อิ่มนาน ไม่เติมน้ำตาล เหมาะสำหรับผู้ที่ต้องการคุมน้ำหนัก รักษารูปร่าง หรือเติมโปรตีนหลังออกกำลังกาย
2. ชาสลายไขมัน: ชาเบิร์นสกัดเข้มข้น ช่วยกระตุ้นระบบเผาผลาญ ลดไขมันสะสม ดื่มแล้วสดชื่นตลอดวัน

[ขนม/ของหวานสุขภาพ]
- วาฟเฟิลโปรตีนไร้แป้ง: กรอบนอกนุ่มใน โปรตีนเน้นๆ ไร้แป้งสาลี ไร้น้ำตาล 
  (หมายเหตุ: เมนูวาฟเฟิลโปรตีนไร้แป้งมีให้บริการเฉพาะบางสาขาเท่านั้น แนะนำให้ลูกค้าระบุสาขาที่สะดวกสั่งเพื่อให้แอดมินเช็คสต็อกให้ก่อนนะคะ)

[โปรแกรมลดน้ำหนัก & คุมรูปร่าง]
1. โปรแกรม 3 วัน ว้าวว: เซ็ตเริ่มต้น ปรับระบบเผาผลาญ ลดอาการบวมน้ำ
2. โปรแกรม 7 วัน ฟิต: เซ็ตยอดฮิต สลายไขมัน ปรับพฤติกรรมการกินอย่างเห็นผล
3. โปรแกรม 10 วัน เฟิร์ม: เซ็ตเปลี่ยนรูปร่างขั้นสุด ลดน้ำหนักแบบยั่งยืน พร้อมดูแลต่อเนื่อง


คุณคือผู้ช่วยตอบแชตประจำร้าน ตอบลูกค้าด้วยความสุภาพ เป็นกันเอง และปฏิบัติตามเงื่อนไขอย่างเคร่งครัดดังนี้:

1. เรื่องการชำระเงิน / เลขบัญชี:
- หากลูกค้าถามเรื่อง "เลขบัญชี", "ธนาคาร", "โอนเงิน" หรือ "ชำระเงิน" ห้ามคิดเลขบัญชีขึ้นมาเองเด็ดขาด ให้ตอบว่า:
  "รับทราบค่ะ เดี๋ยวแอดมินจะรีบส่งรายละเอียดเลขบัญชีและสรุปยอดชำระให้ในแชทนี้นะคะ รอสักครู่ค่ะ"

2. เรื่องการจัดส่ง / เดลิเวอรี:
- หากลูกค้าสอบถามเรื่องการจัดส่ง ให้แจ้งว่าทางร้านมีบริการจัดส่ง 2 รูปแบบหลัก:
  1) ทางร้าน / (ขึ้นอยู่กับระยะทางและช่วงเวลา)
  2) ให้เรียกรถเอกชน (เช่น Grab หรือ วินมอเตอร์ไซค์) มารับสินค้าที่หน้าร้าน ให้ขอพิกัด/สถานที่จัดส่งเบื้องต้นไว้ แล้วแจ้งว่าแอดมินจะเข้าประเมินการจัดส่งให้อีกครั้งค่ะ
`;

// ฟังก์ชันส่งข้อความไปหา Gemini AI
async function getAIReply(userText) {
  try {
    const response = await ai.models.generateContent({
  model: 'gemini-3.6-flash', // 👈 ใส่รุ่นนี้ตามที่ Google Recommends ใน Log
  contents: userText,
  config: {
    systemInstruction: SYSTEM_INSTRUCTION
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error in getAIReply:", error);
    return "ขออภัยค่ะ ขณะนี้ระบบขัดข้องชั่วคราว เดี๋ยวแอดมินจะรีบมาตอบนะคะ";
  }
}

// Verification Webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Handling incoming messages (แก้ปัญหา Facebook Timeout และการตอบซ้ำ)
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    // ⚡ ตอบ Facebook ทันทีใน 0.1 วินาที ป้องกัน Facebook คิดว่าระบบล่มแล้วส่งข้อความมาซ้ำ
    res.status(200).send('EVENT_RECEIVED');

    // ประมวลผลและตอบแชทลูกค้าแบบ Async
    body.entry.forEach(async (entry) => {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      if (webhook_event.message) {
        await handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        await handlePostback(sender_psid, webhook_event.postback);
      }
    });
  } else {
    res.sendStatus(404);
  }
});

async function handleMessage(sender_psid, received_message) {
  // 1. ถ้ารับรูปภาพ (สลิปโอนเงิน)
  if (received_message.attachments) {
    const responseText = 'ขอบคุณสำหรับสลิปชำระเงินค่ะ! 🙏 กรุณาแจ้งชื่อ-ที่อยู่ เบอร์โทรศัพท์ และสาขาที่ต้องการรับสินค้าได้เลยนะคะ';
    await callSendAPI(sender_psid, { text: responseText });
    return; // จบการทำงานทันที ไม่ส่งเมนูต้อนรับซ้ำ
  }

  const text = received_message.text ? received_message.text.trim() : '';

  // 2. ถ้าลูกค้า พิมพ์คำว่า "เมนู" หรือ "สั่ง"
  if (text.includes('เมนู') || text.includes('สั่ง')) {
    await sendMenuCarousel(sender_psid);
    return;
  }

  // 3. คำถามอื่นๆ ให้ AI (Gemini) ตอบทั้งหมด
  const aiReply = await getAIReply(text);
  await callSendAPI(sender_psid, { text: aiReply });
}

async function handlePostback(sender_psid, received_postback) {
  const payload = received_postback.payload;

  if (payload === 'ORDER_SET_A' || payload === 'ORDER_SET_B') {
    const responseText = 'รับออเดอร์เรียบร้อยค่ะ! กรุณารอแอดมินสักครู่เพื่อตรวจสอบรายการและส่งเลขบัญชีให้นะคะ 😊';
    await callSendAPI(sender_psid, { text: responseText });
  }
}

async function sendMenuCarousel(sender_psid) {
  const messageData = {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: 'เครื่องดื่ม & วาฟเฟิลสุขภาพ',
            image_url: 'https://via.placeholder.com/300x200',
            subtitle: 'สมูทตี้โปรตีน, ชาสลายไขมัน และวาฟเฟิลไร้แป้ง',
            buttons: [{ type: 'postback', title: 'สนใจสั่งซื้อ', payload: 'ORDER_SET_A' }]
          },
          {
            title: 'โปรแกรมลดน้ำหนัก 3/5/10 วัน',
            image_url: 'https://via.placeholder.com/300x200',
            subtitle: 'โปรแกรมคุมรูปร่าง ปรับระบบเผาผลาญ',
            buttons: [{ type: 'postback', title: 'สนใจโปรแกรม', payload: 'ORDER_SET_B' }]
          }
        ]
      }
    }
  };
  await callSendAPI(sender_psid, messageData);
}

async function callSendAPI(sender_psid, response) {
  const request_body = { recipient: { id: sender_psid }, message: response };
  try {
    await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body);
  } catch (error) {
    console.error('Unable to send message:', error.response ? error.response.data : error);
  }
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

