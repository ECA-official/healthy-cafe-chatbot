require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.get('/privacy', (req, res) => res.send('<h1>Privacy Policy</h1>'));
app.get('/', (req, res) => res.send('Madam Healthy Cafe Bot is running!'));

const PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const API_KEYS = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

let pageTokens = {};
try {
  pageTokens = JSON.parse(process.env.PAGE_TOKENS || '{}');
} catch (e) {
  console.error('Failed to parse PAGE_TOKENS');
}

const SYSTEM_INSTRUCTION = `
คุณคือแอดมิน AI ตอบแชทลูกค้าของเพจ "Healthy Cafe" คาเฟ่สุขภาพเพื่อคนรักรูปร่างและสุขภาพ
ตอบด้วยคำสุภาพ น่ารัก เป็นกันเอง มีหางเสียง (ค่ะ/นะคะ) สั้นกระชับ ให้ข้อมูลแม่นยำและใส่ใจสุขภาพลูกค้า

[เกี่ยวกับร้าน]
- เราคือ คาเฟ่สุขภาพ (Healthy Cafe) เน้นเครื่องดื่มเพื่อสุขภาพ สำหรับคนดูแลรูปร่าง ควบคุมน้ำหนักโดยเฉพาะ
- เวลาทำการ: 08:00 - 18:00 น. (เปิดทุกวัน)

[เมนูเครื่องดื่มสุขภาพ]
1. สมูทตี้โปรตีนปั่น: โปรตีนสูง อิ่มนาน ไม่เติมน้ำตาล เหมาะสำหรับผู้ที่ต้องการคุมน้ำหนัก รักษารูปร่าง หรือเติมโปรตีนหลังออกกำลังกาย
2. ชาสลายไขมัน: ชาเบิร์นสกัดเข้มข้น ช่วยกระตุ้นระบบเผาผลาญ ลดไขมันสะสม ดื่มแล้วสดชื่นตลอดวัน

[โปรแกรมลดน้ำหนัก & คุมรูปร่าง]
1) โปรแกรม 3 วัน WOW
ฮุก: ตัวบวม น้ำหนักขึ้นง่าย? เริ่มเปลี่ยนได้ใน 3 วัน!
เซตเริ่มต้นสำหรับคนอยากดูแลรูปร่าง ช่วยปรับพฤติกรรมการกินและลดความรู้สึกบวมน้ำ ให้ร่างกายกลับมาสดชื่นอีกครั้ง
2) โปรแกรม 7 วัน FIT SET
ฮุก: 7 วัน จุดเริ่มต้นของหุ่นที่คุณอยากมี
โปรแกรมยอดฮิต เน้นปรับการกิน ควบคุมรูปร่าง และสร้างวินัยให้เห็นความเปลี่ยนแปลงแบบจับต้องได้
3) โปรแกรม 10 วัน FIRM SET
ฮุก: เปลี่ยนหุ่นให้เฟิร์ม แบบไม่ต้องอดอาหาร
โปรแกรมเข้มข้น 10 วัน สำหรับคนที่อยากลดน้ำหนักอย่างยั่งยืน พร้อมมีแนวทางดูแลต่อเนื่องเพื่อรักษาผลลัพธ์
[ลำดับขั้นตอนการคุยอย่างเคร่งครัด (STRICT WORKFLOW)]

ขั้นตอนที่ 1: การแนะนำโปรแกรม
- ให้เสนอรายละเอียดโปรแกรม 1, 2, 3 
- ให้จบข้อความแค่ประโยคนี้เท่านั้น:
  "พิเศษ! ตอนนี้มีสิทธิ์ตรวจเช็คสุขภาพและรูปร่างด้วยเครื่องมือทางการแพทย์ฟรีนะคะ ✨"
- ❌ ห้ามถามประโยค "สนใจรับสิทธิ์... ถ้ารับสิทธิ์ให้พิมพ์ว่า..." ในขั้นตอนนี้เด็ดขาด!

ขั้นตอนที่ 2: เมื่อลูกค้าเลือก/สนใจโปรแกรม
- ให้ตรวจสอบว่าลูกค้าส่งข้อมูลทั้ง 4 ข้อนี้มาหรือยัง: (1.ชื่อเล่น 2.อายุ 3.น้ำหนัก 4.ส่วนสูง)
- หากยังไม่ได้ให้ หรือให้มาไม่ครบ ให้ส่งข้อความขอข้อมูล (ถามเฉพาะหัวข้อที่ขาด):
  "เพื่อเป็นความสะดวกในการให้บริการ ขออนุญาตทราบรายละเอียดของคุณลูกค้านะคะ
  - ชื่อเล่น
  - อายุ
  - น้ำหนัก
  - ส่วนสูง"
- หากลูกค้าให้ข้อมูลครบทั้ง 4 ข้อแล้ว ให้รับทราบข้อมูล และถามปิดท้ายว่า:
  "สนใจรับสิทธิ์ตรวจเช็คสุขภาพและรูปร่างด้วยเครื่องมือทางการแพทย์ฟรีด้วยไหมคะ? ถ้ารับสิทธิ์ให้พิมพ์ว่า 'รับสิทธิ์' มาด้วยนะคะ"

ขั้นตอนที่ 3: เมื่อลูกค้านัดวันเวลาเข้ามาหน้าร้าน
- ให้สรุปยืนยันวันเวลาอย่างสุภาพ เช่น "แอดมินบันทึกวันและเวลาเรียบร้อยค่ะ..."
- ❌ ห้ามส่งประโยค "สนใจรับสิทธิ์ตรวจเช็คสุขภาพ..." ซ้ำอีกเด็ดขาดในขั้นตอนนี้!

[กฎสำคัญอื่นๆ]
1. เรื่องการทักทาย: ห้ามกล่าวสวัสดีพร่ำเพรื่อ ให้ตอบเข้าประเด็นทันที จะสวัสดีเฉพาะเมื่อลูกค้าทักสวัสดีมาก่อนเท่านั้น
2. เรื่องการเงิน: ห้ามแจก/สุ่มเลขบัญชี ให้แจ้งว่ารอสักครู่ ผู้เชี่ยวชาญจะส่งให้
`;

// อัปเดตใช้เฉพาะโมเดลที่ Google รองรับในปัจจุบัน
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite'
];

async function getAIReply(userText) {
  if (API_KEYS.length === 0) {
    console.error("❌ GEMINI_API_KEY Missing");
    return "ขออภัยค่ะ ขณะนี้ระบบขัดข้องชั่วคราว เดี๋ยวผู้เชี่ยวชาญจะรีบกลับมาต่อนะคะ";
  }

  for (const currentKey of API_KEYS) {
    const cleanKey = currentKey.trim();

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
        const payload = {
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }]
        };

        const res = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });

        if (res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.log(`✅ Success using model: ${modelName}`);
          return res.data.candidates[0].content.parts[0].text;
        }
      } catch (error) {
        console.error(`⚠️ Model ${modelName} Error:`, error.response?.data?.error?.message || error.message);
      }
    }
  }

  return "ขออภัยค่ะ ขณะนี้ระบบขัดข้องชั่วคราว เดี๋ยวผู้เชี่ยวชาญจะรีบกลับมาต่อนะคะ";
}

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    res.status(200).send('EVENT_RECEIVED');
    body.entry.forEach(async (entry) => {
      const page_id = entry.id;
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      if (webhook_event.message) {
        await handleMessage(sender_psid, webhook_event.message, page_id);
      }
    });
  } else {
    res.sendStatus(404);
  }
});

async function handleMessage(sender_psid, received_message, page_id) {
  const text = received_message.text ? received_message.text.trim() : '';

  if (received_message.attachments || text.includes('สลิป') || text.includes('โอนแล้ว')) {
    await callSendAPI(sender_psid, { text: "รับยอดค่ะ" }, page_id);
    return;
  }

  if (text.includes('โอน') || text.includes('เลขบัญชี') || text.includes('จ่ายเงิน')) {
    await callSendAPI(sender_psid, { text: "รอสักครู่นะคะ ผู้เชี่ยวชาญจะส่งเลขบัญชีให้ค่ะ" }, page_id);
    return;
  }

  if (text.includes('รับสิทธิ์')) {
    await callSendAPI(sender_psid, { text: "ขอบคุณสำหรับการรับสิทธิ์ค่ะ ขอทราบเวลาที่สะดวกเข้ามาหน้าร้านนะคะ" }, page_id);
    return;
  }

  const aiReply = await getAIReply(text);
  await callSendAPI(sender_psid, { text: aiReply }, page_id);
}

async function callSendAPI(sender_psid, response, page_id) {
  const token = pageTokens[page_id] || PAGE_ACCESS_TOKEN;
  try {
    await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${token}`, {
      recipient: { id: sender_psid },
      message: response
    });
  } catch (error) {
    console.error('Send message failed:', error.response ? error.response.data : error.message);
  }
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
