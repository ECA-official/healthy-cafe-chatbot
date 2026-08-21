require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Madam Healthy Cafe Bot is running!');
});

const PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// -------------------------------------------------------------
// 📌 [คลังความรู้ร้าน] Madam Healthy Cafe (Healthy Cafe)
// -------------------------------------------------------------
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
1) โปรแกรม 3 วัน WOW: เซตเริ่มต้นสำหรับคนอยากดูแลรูปร่าง ช่วยปรับพฤติกรรมการกินและลดความรู้สึกบวมน้ำ ให้ร่างกายกลับมาสดชื่นอีกครั้ง
2) โปรแกรม 7 วัน FIT SET: โปรแกรมยอดฮิต เน้นปรับการกิน ควบคุมรูปร่าง และสร้างวินัยให้เห็นความเปลี่ยนแปลงแบบจับต้องได้
3) โปรแกรม 10 วัน FIRM SET: โปรแกรมเข้มข้น 10 วัน สำหรับคนที่อยากลดน้ำหนักอย่างยั่งยืน พร้อมมีแนวทางดูแลต่อเนื่องเพื่อรักษาผลลัพธ์

[ลำดับขั้นตอนการคุยอย่างเคร่งครัด (STRICT WORKFLOW)]

ขั้นตอนที่ 1: การแนะนำโปรแกรม
- ให้เสนอรายละเอียดโปรแกรม 1, 2, 3 
- ให้จบข้อความแค่ประโยคนี้เท่านั้น:
  "พิเศษ! ตอนนี้มีสิทธิ์ตรวจเช็คสุขภาพและรูปร่างด้วยเครื่องมือทางการแพทย์ฟรีนะคะ ✨"
- ❌ ห้ามถามประโยค "สนใจรับสิทธิ์... ถ้ารับสิทธิ์ให้พิมพ์ว่า..." ในขั้นตอนนี้เด็ดขาด!

ขั้นตอนที่ 2: เมื่อลูกค้าเลือก/สนใจโปรแกรม
- ให้ตรวจสอบว่าลูกค้าส่งข้อมูลทั้ง 6 ข้อนี้มาหรือยัง: (1.ชื่อเล่น 2.อายุ 3.น้ำหนัก 4.ส่วนสูง 5.เบอร์โทรติดต่อ 6.โรคประจำตัว)
- หากยังไม่ได้ให้ หรือให้มาไม่ครบ ให้ส่งข้อความขอข้อมูล (ถามเฉพาะหัวข้อที่ขาด):
  "เพื่อเป็นความสะดวกในการให้บริการ ขออนุญาตทราบรายละเอียดของคุณลูกค้านะคะ
  - ชื่อเล่น
  - อายุ
  - น้ำหนัก
  - ส่วนสูง
  - เบอร์โทรติดต่อ
  และมีโรคประจำตัวอะไรด้วยมั้ยคะ"
- หากลูกค้าให้ข้อมูลครบทั้ง 6 ข้อแล้ว ให้รับทราบข้อมูล และถามปิดท้ายว่า:
  "สนใจรับสิทธิ์ตรวจเช็คสุขภาพและรูปร่างด้วยเครื่องมือทางการแพทย์ฟรีด้วยไหมคะ? ถ้ารับสิทธิ์ให้พิมพ์ว่า 'รับสิทธิ์' มาด้วยนะคะ"

ขั้นตอนที่ 3: เมื่อลูกค้านัดวันเวลาเข้ามาหน้าร้าน
- ให้สรุปยืนยันวันเวลาอย่างสุภาพ เช่น "แอดมินบันทึกวันและเวลาเรียบร้อยค่ะ..."
- ❌ ห้ามส่งประโยค "สนใจรับสิทธิ์ตรวจเช็คสุขภาพ..." ซ้ำอีกเด็ดขาดในขั้นตอนนี้!

[กฎสำคัญอื่นๆ]
1. เรื่องการทักทาย: ห้ามกล่าวสวัสดีพร่ำเพรื่อ ให้ตอบเข้าประเด็นทันที จะสวัสดีเฉพาะเมื่อลูกค้าทักสวัสดีมาก่อนเท่านั้น
2. เรื่องการเงิน: ห้ามแจก/สุ่มเลขบัญชี ให้แจ้งว่ารอสักครู่ ผู้เชี่ยวชาญจะส่งให้
`;

// ฟังก์ชันเรียก Gemini API แบบ Auto-Retry หลายชื่อ Model ป้องกัน 404
async function getAIReply(userText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY Missing!");
    return "ขออภัยค่ะ ขณะนี้ระบบขัดข้องชั่วคราว เดี๋ยวผู้เชี่ยวชาญจะรีบกลับมาต่อนะคะ";
  }

  // ลิสต์โมเดลสำรอง วนลูปยิงจนกว่าจะเจอตัวที่ใช้ได้
  const candidateModels = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-1.5-pro'
  ];

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await axios.post(url, {
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userText }]
          }
        ]
      }, { timeout: 10000 });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`✅ Success with model: ${model}`);
        return response.data.candidates[0].content.parts[0].text;
      }
    } catch (error) {
      console.log(`⚠️ Model ${model} failed (Status: ${error.response?.status || 'Error'}). Trying next candidate...`);
    }
  }

  console.error("❌ All Gemini Models Failed!");
  return "ขออภัยค่ะ ขณะนี้ระบบขัดข้องชั่วคราว เดี๋ยวผู้เชี่ยวชาญจะรีบกลับมาต่อนะคะ";
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

// Handling incoming messages
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    res.status(200).send('EVENT_RECEIVED');

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

async function handleMessage(sender_psid, received_message, page_id) {
  const text = received_message.text ? received_message.text.trim() : '';

  if (received_message.attachments || text.includes('สลิป') || text.includes('โอนแล้ว')) {
    await callSendAPI(sender_psid, { text: "รับยอดค่ะ" });
    return;
  }

  if (text.includes('โอน') || text.includes('เลขบัญชี') || text.includes('จ่ายเงิน') || text.includes('ชำระเงิน') || text.includes('คิวอาร์') || text.includes('qr')) {
    await callSendAPI(sender_psid, { 
      text: "รอสักครู่นะคะ ผู้เชี่ยวชาญจะส่งเลขบัญชีหรือคิวอาร์โค้ดเพื่อแสกนจ่ายเงินมาให้นะคะ" 
    });
    return;
  }

  if (text.includes('รับสิทธิ์')) {
    await callSendAPI(sender_psid, { 
      text: "ขอบคุณสำหรับการรับสิทธิ์ตรวจเช็กสุขภาพและรูปร่างค่ะ" 
    });
    await callSendAPI(sender_psid, { 
      text: "ขอทราบเวลาที่คุณลูกค้าสะดวกเข้ามารับบริการทางหน้าร้านค่ะ" 
    });
    return;
  }

  if (text.includes('โทร') || text.includes('ติดต่อ') || text.includes('เบอร์') || text.includes('ปรึกษา')) {
    await sendContactButton(sender_psid, page_id);
    return;
  }

  if (text.includes('เมนู') || text.includes('สั่ง') || text.includes('รูป')) {
    await sendMenuImage(sender_psid);
    return;
  }

  if (text.includes('ที่อยู่') || text.includes('พิกัด') || text.includes('แผนที่') || text.includes('ร้านอยู่ไหน')) {
    await sendLocationButton(sender_psid, page_id);
    return;
  }

  const aiReply = await getAIReply(text);
  await callSendAPI(sender_psid, { text: aiReply });
}

async function handlePostback(sender_psid, received_postback) {
  console.log('Postback received:', received_postback);
}

async function sendMenuImage(sender_psid) {
  const menuImages = [
    "URL_รูปภาพที่_1_วางตรงนี้.jpg",
    "URL_รูปภาพที่_2_วางตรงนี้.jpg"
  ];

  for (const imageUrl of menuImages) {
    if (imageUrl.includes("URL_รูปภาพที่")) continue;

    const messageData = {
      attachment: {
        type: "image",
        payload: {
          url: imageUrl,
          is_reusable: true
        }
      }
    };
    await callSendAPI(sender_psid, messageData);
  }
}

async function sendLocationButton(sender_psid, page_id) {
  const pageUrl = page_id ? `https://www.facebook.com/${page_id}` : "https://www.facebook.com";
  const messageData = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: "คุณลูกค้าสามารถคลิกดูพิกัดและแผนที่ร้านบนหน้าเพจของเราได้เลยค่ะ 📍",
        buttons: [
          {
            type: "web_url",
            url: pageUrl,
            title: "ดูพิกัดบนหน้าเพจ"
          }
        ]
      }
    }
  };
  await callSendAPI(sender_psid, messageData);
}

async function sendContactButton(sender_psid, page_id) {
  const pageUrl = page_id ? `https://www.facebook.com/${page_id}/about` : "https://www.facebook.com";
  const messageData = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: "หากมีข้อสอบถามหรือต้องการปรึกษาเพิ่มเติม สามารถโทรติดต่อผู้เชี่ยวชาญได้เลยนะคะ ยินดีให้บริการค่ะ 📞",
        buttons: [
          {
            type: "web_url",
            url: pageUrl,
            title: "ติดต่อผู้เชี่ยวชาญ"
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
