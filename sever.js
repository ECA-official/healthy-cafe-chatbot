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
คุณคือแอดมิน AI ตอบแชทลูกค้าของเพจ "Healthy Cafe" คาเฟ่สุขภาพเพื่อคนรักรูปร่างและสุขภาพ
ตอบด้วยคำสุภาพ น่ารัก เป็นกันเอง มีหางเสียง (ค่ะ/นะคะ) สั้นกระชับ ให้ข้อมูลแม่นยำและใส่ใจสุขภาพลูกค้า

[เกี่ยวกับร้าน]
- เราคือ คาเฟ่สุขภาพ (Healthy Cafe) เน้นเครื่องดื่มพื่อสุขภาพ สำหรับคนดูแลรูปร่าง ควบคุมหน้ำหนักโดยเฉพาะ
- เวลาทำการ: 08:00 - 18:00 น. (เปิดทุกวัน)

[เมนูเครื่องดื่มสุขภาพ]
1. สมูทตี้โปรตีนปั่น: โปรตีนสูง อิ่มนาน ไม่เติมน้ำตาล เหมาะสำหรับผู้ที่ต้องการคุมน้ำหนัก รักษารูปร่าง หรือเติมโปรตีนหลังออกกำลังกาย
2. ชาสลายไขมัน: ชาเบิร์นสกัดเข้มข้น ช่วยกระตุ้นระบบเผาผลาญ ลดไขมันสะสม ดื่มแล้วสดชื่นตลอดวัน

[โปรแกรมลดน้ำหนัก & คุมรูปร่าง]
1) โปรแกรม 3 วัน WOW
ตัวบวม น้ำหนักขึ้นง่าย? เริ่มเปลี่ยนได้ใน 3 วัน!
เซตเริ่มต้นสำหรับคนอยากดูแลรูปร่าง ช่วยปรับพฤติกรรมการกินและลดความรู้สึกบวมน้ำ ให้ร่างกายกลับมาสดชื่นอีกครั้ง
2) โปรแกรม 7 วัน FIT SET
7 วัน จุดเริ่มต้นของหุ่นที่คุณอยากมี
โปรแกรมยอดฮิต เน้นปรับการกิน ควบคุมรูปร่าง และสร้างวินัยให้เห็นความเปลี่ยนแปลงแบบจับต้องได้
3) โปรแกรม 10 วัน FIRM SET
เปลี่ยนหุ่นให้เฟิร์ม แบบไม่ต้องอดอาหาร
โปรแกรมเข้มข้น 10 วัน สำหรับคนที่อยากลดน้ำหนักอย่างยั่งยืน พร้อมมีแนวทางดูแลต่อเนื่องเพื่อรักษาผลลัพธ์

โปรโมชั่นพิเศษเมื่อตัดสินใจเข้าโปรแกรมกับทางเราสามารถใช้สิทธิ์ตรวจเช็คสุขภาพและรูปร่างด้วยเครื่องมือทางการแพทย์ได้ฟรี


คุณคือผู้ช่วยตอบแชตประจำร้าน ตอบลูกค้าด้วยความสุภาพ เป็นกันเอง และปฏิบัติตามเงื่อนไขอย่างเคร่งครัดดังนี้:

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
    return "ขออภัยค่ะ ขณะนี้ระบบขัดข้องชั่วคราว เดี๋ยวผู้เชี่ยวชาญจะรีบกลับมาต่อนะคะ";
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
        await handleMessage(sender_psid, webhook_event.message, entry.id);
      } else if (webhook_event.postback) {
        await handlePostback(sender_psid, webhook_event.postback);
      }
    });
  } else {
    res.sendStatus(404);
  }
});

// ฟังก์ชันจัดการข้อความขาเข้า
async function handleMessage(sender_psid, received_message, page_id) {
  const text = received_message.text ? received_message.text.trim() : '';

  // 2. ถ้าลูกค้า พิมพ์คำว่า "เมนู" หรือ "สั่ง"
  if (text.includes('เมนู') || text.includes('สั่ง')) {
    const carouselData = await getPagePostsAsCarousel(page_id, PAGE_ACCESS_TOKEN);
    if (carouselData) {
      await callSendAPI(sender_psid, carouselData);
      return;
    }
  }

  // 3. คำถามอื่นๆ ให้ AI (Gemini) ตอบทั้งหมด
  const aiReply = await getAIReply(text);
  await callSendAPI(sender_psid, { text: aiReply });
}

// ฟังก์ชันจัดการ Postback
async function handlePostback(sender_psid, received_postback) {
  console.log('Postback received:', received_postback);
}

// ฟังก์ชันดึงโพสต์ล่าสุดจากหน้าเพจโดยตรง (ไม่ต้องใช้ Database)
async function getPagePostsAsCarousel(page_id, page_access_token) {
  try {
    // 1. ดึง 5 โพสต์ล่าสุดที่มีรูปภาพจาก Graph API ของเพจนั้น
    const url = `https://graph.facebook.com/v20.0/${page_id}/posts?fields=message,full_picture,permalink_url&limit=5&access_token=${page_access_token}`;
    const response = await fetch(url);
    const result = await response.json();

    if (!result.data || result.data.length === 0) return null;

    // 2. แปลงข้อความและรูปภาพจากหน้าเพจ มาเป็นรูปแบบ Carousel อัตโนมัติ
    const elements = result.data
      .filter(post => post.full_picture) // เอาเฉพาะโพสต์ที่มีรูป
      .map(post => ({
        title: post.message ? post.message.split('\n')[0].substring(0, 80) : 'สินค้า/เมนูแนะนำ',
        image_url: post.full_picture,
        subtitle: post.message ? post.message.substring(0, 80) : 'กดเพื่อดูรายละเอียด',
        buttons: [{
          type: 'web_url',
          url: post.permalink_url,
          title: 'ดูโพสต์บนเพจ'
        }]
      }));

    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements
        }
      }
    };
  } catch (error) {
    console.error("Error fetching page posts:", error);
    return null;
  }
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
