require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.get('/privacy', (req, res) => res.send('<h1>Privacy Policy</h1>'));
app.get('/', (req, res) => res.send('Madam Healthy Cafe Bot is running!'));

const PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const API_KEYS = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

// รองรับ Page Token หลายเพจ
let pageTokens = {};
try {
  pageTokens = JSON.parse(process.env.PAGE_TOKENS || '{}');
} catch (e) {
  console.error('Failed to parse PAGE_TOKENS');
}

// รองรับ URL หน้าเพจเฉพาะของแต่ละเพจ (ถ้ามี)
let pageUrls = {};
try {
  pageUrls = JSON.parse(process.env.PAGE_URLS || '{}');
} catch (e) {
  console.error('Failed to parse PAGE_URLS');
}

// =========================================================================
// 💳 รายละเอียดบัญชีชำระเงิน และ ชื่อไฟล์รูป QR Code หน้าแรก GitHub
// =========================================================================
const PAYMENT_DETAILS = {
  "862654046938799": {
    accountName: "น.ส.ทิวาพร อิตประดิษฐ",
    bankName: "ธนาคารกสิกรไทย (KBANK)",
    accountNumber: "025-1-53577-9",
    qrImage: "https://healthy-cafe-chatbot.onrender.com/Qrmadam.jpg" // ชื่อไฟล์รูปที่วางหน้าแรกคู่กับ sever.js
  },
  "825790847294552": {
    accountName: "น.ส.อินทิรา ณ พัทลุง",
    bankName: "พร้อมเพย์",
    accountNumber: "081-5659698",
    qrImage: "https://healthy-cafe-chatbot.onrender.com/Qrann.jpg" // ชื่อไฟล์รูปที่วางหน้าแรกคู่กับ sever.js
  },
   "1295046180355252": {
    accountName: "นาย วุฒิชัย แก้วนิล",
    bankName: "พร้อมเพย์",
    accountNumber: "099-7012530",
    qrImage: "https://healthy-cafe-chatbot.onrender.com/Qrjackport.jpg" // ชื่อไฟล์รูปที่วางหน้าแรกคู่กับ sever.js
  }
};    
  // เพิ่มเพจอื่นๆ ตรงนี้ได้เลยครับ:
  // ,
  // "862654046938799": {
  //   accountName: "บริษัท มาดาม เฮลท์ตี้ จำกัด (สาขา 2)",
  //   bankName: "ธนาคารไทยพาณิชย์ (SCB)",
  //   accountNumber: "987-6-54321-0",
  //   qrImage: "862654046938799.png"
  // }
const SYSTEM_INSTRUCTION = `
คุณคือแอดมิน AI ตอบแชทลูกค้าของเพจ "Healthy Cafe" คาเฟ่สุขภาพเพื่อคนรักรูปร่างและสุขภาพ
ตอบด้วยคำสุภาพ น่ารัก เป็นกันเอง มีหางเสียง (ค่ะ/นะคะ) สั้นกระชับ ให้ข้อมูลแม่นยำและใส่ใจสุขภาพลูกค้า

[เกี่ยวกับร้าน]
- เราคือ คาเฟ่สุขภาพ (Healthy Cafe) เน้นเครื่องดื่มเพื่อสุขภาพ สำหรับคนดูแลรูปร่าง ควบคุมน้ำหนักโดยเฉพาะ
- เวลาทำการ: 08:00 - 18:00 น. (เปิดทุกวัน)

[เมนูเครื่องดื่มสุขภาพ & รสชาติยอดฮิต]
- กลูแคนสกาย, สตอเบอร์รี่ โยเกิร์ต, บลูเบอร์รี่ โยเกิร์ต, ดับเบิ้ล ช็อกโกแลต, โปรตีน มอคค่า, โปรตีน เพียวมัทฉะ, คอลลาเจน อเมริกาโน่, คอลลาเจน บิวตี้รีเฟรช

[โปรแกรมลดน้ำหนัก & คุมรูปร่าง]
1) โปรแกรม 3 วัน WOW
ฮุก: ตัวบวม น้ำหนักขึ้นง่าย? เริ่มเปลี่ยนได้ใน 3 วัน!
เซตเริ่มต้นสำหรับคนอยากดูแลรูปร่าง ช่วยปรับพฤติกรรมการกินและลดความรู้สึกบวมน้ำ ให้ร่างกายกลับมาสดชื่นอีกครั้ง

2)โปรแกรม 5 วัน FIT SET (เซตยอดฮิตเปลี่ยนหุ่น)
ฮุก: 5 วัน จุดเริ่มต้นของหุ่นที่คุณอยากมี!
เพียง 1,230 บาท | แถมฟรี! โปรตีนพรีเมียม 1 ขวด ✨
โปรแกรมคุมรูปร่างขายดีที่สุด เน้นปรับการกิน คุมหิวอิ่มนาน สร้างวินัยให้เห็นความเปลี่ยนแปลงสัดส่วนชัดเจน

3)โปรแกรม 10 วัน FIRM SET (เซตล็อคหุ่นเฟิร์ม)
ฮุก: เปลี่ยนหุ่นให้เฟิร์มกระชับ แบบไม่ต้องอดอาหาร!
เพียง 2,390 บาท | แถมฟรี! คอลลาเจน บิวตี้รีเฟรช 1 กล่อง + แก้วเชกพรีเมียม 1 ใบ ✨
โปรแกรมเข้มข้นสำหรับคนอยากลดน้ำหนักจริงจัง ช่วยลีนไขมัน กระชับสัดส่วน พร้อมมีแนวทางดูแลต่อเนื่องเพื่อผลลัพธ์ยั่งยืน

[โปรแกรมดูแลสุขภาพ]
1) โปรแกรม 3 วัน WOW
2) โปรแกรม 5 วัน FIT SET
3) โปรแกรม 10 วัน FIRM SET

[กฎเหล็กและลำดับขั้นตอนการคุย (STRICT WORKFLOW)]

1. การส่งรายละเอียดโปรแกรม และ โปรโมชั่นสิทธิ์ฟรี:
   - ส่งรายละเอียดโปรแกรม 1, 2, 3 พร้อมข้อความ✨ สิทธิพิเศษ! สแกนวิเคราะห์มวลไขมัน & สัดส่วนเชิงลึกด้วย Body Scan
   - ประโยคถามรับสิทธิ์ที่ต้องใช้:
     "สิทธิพิเศษนี้สำหรับผู้ที่ตัดสินใจมาเข้าโปรแกรมกับทางร้านเรา (ก่อนใช้สิทธิ์สามารถทักมาสำรองสิทธิ์กับทางร้านก่อนนะคะ)"

2. เมื่อลูกค้าพิมพ์สนใจ / ขอทดลอง / ยืนยันเลือกโปรแกรมเข้ามา:
   - ❌ **ห้ามส่งรายละเอียดโปรแกรมซ้ำเด็ดขาด!** 
   - ❌ **ห้ามส่งข้อความโปรโมชั่น/สิทธิ์ฟรี ซ้ำเด็ดขาด!**
   - ให้ตอบรับด้วยความยินดีสั้นๆ เช่น "ยินดีค่ะคุณลูกค้า ✨" สะดวกมารับที่ร้านหรือให้จัดส่งคะ
   - ให้ตอบกลับด้วย "สะดวกมาชำระที่หน้าร้านหรือสะดวกโอนคะ

3. ขั้นตอนขอข้อมูลและการชำระเงิน:
   - ถ้าลูกค้าสะดวกโอนให้ลูกค้าส่งสลีปเข้ามาให้ตอบ "รับยอดค่ะ"
   - ถ้าลูกค้าสะดวกรับหน้าร้านให้ตอบ "โอเคค่ะ"
   - หากครบแล้ว หรือลูกค้าพร้อมชำระเงิน ให้ตอบเข้าสู่ขั้นตอนการชำระเงินทันที

4. การนัดวันเวลาหน้าร้าน:
   - หากลูกค้าสะดวกโอนให้ส่งสลีปแล้วให้ตอบ "รับยอดค่ะ" และ "นัดวันเวลาเข้ามา ให้สรุปยืนยันวันเวลาอย่างสุภาพ และห้ามส่งรายละเอียดโปรแกรมหรือถามรับสิทธิ์ซ้ำอีก"
   - หากลูกค้าสะดวกดข้ามาชำระที่หน้าร้านให้ "นัดวันเวลาเข้ามา ให้สรุปยืนยันวันเวลาอย่างสุภาพ และห้ามส่งรายละเอียดโปรแกรมหรือถามรับสิทธิ์ซ้ำอีก"

[กฎสำคัญอื่นๆ]
1. การทักทาย: ห้ามกล่าวสวัสดีพร่ำเพรื่อ จะสวัสดีเฉพาะเมื่อลูกค้าทักสวัสดีมาก่อนเท่านั้น
`;

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash'
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
        const status = error.response?.status;
        const errMsg = error.response?.data?.error?.message || error.message;
        console.error(`⚠️ Model ${modelName} Error (${status}):`, errMsg);
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
  const text = received_message.text ? received_message.text.trim().toLowerCase() : '';

  // 1. ดักสลิป/แจ้งโอน
  if (received_message.attachments || text.includes('สลิป') || text.includes('โอนแล้ว')) {
    await callSendAPI(sender_psid, { text: "รับยอดเรียบร้อยค่ะ ขอบคุณมากนะคะ ✨" }, page_id);
    return;
  }
  
  // 2. ดักถามโอนเงิน/เลขบัญชี/ชำระเงิน -> ส่งข้อความ + รูป QR Code
  if (text.includes('โอน') || text.includes('เลขบัญชี') || text.includes('ชำระเงิน') || text.includes('จ่ายเงิน')) {
    await sendPaymentInfo(sender_psid, page_id); // 
    return;
  }

  // 3. ดักกรณีลูกค้าพิมพ์ "ไม่รับสิทธิ์"
  if (text.includes('ไม่รับสิทธิ์')) {
    await callSendAPI(sender_psid, { text: "รับทราบค่ะคุณลูกค้า ✨ เดี๋ยวแอดมินพาเข้าสู่ขั้นตอนการชำระเงินและเตรียมจัดส่งให้นะคะ รอสักครู่ค่ะ" }, page_id);
    return;
  }

  // 4. ดักกรณีลูกค้าพิมพ์ "รับสิทธิ์"
  if (text.includes('รับสิทธิ์')) {
    await callSendAPI(sender_psid, { text: "ขอบคุณสำหรับการรับสิทธิ์ค่ะ ✨ ขอทราบวันและเวลาที่สะดวกเข้ามาหน้าร้านนะคะ" }, page_id);
    return;
  }

  // 5. ดักถามพิกัด / ร้านอยู่ไหน / ช่องทางติดต่อ
  if (text.includes('พิกัด') || text.includes('ร้านอยู่ไหน') || text.includes('แผนที่') || text.includes('อยู่ที่ไหน') || text.includes('location') || text.includes('ติดต่อ') || text.includes('เบอร์')) {
    const targetUrl = pageUrls[page_id] || `https://www.facebook.com/${page_id}`;

    const buttonPayload = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "สามารถดูพิกัดและรายละเอียดการเดินทาง/ติดต่อเพิ่มเติมได้ที่หน้าเพจของเราได้เลยนะคะ ✨",
          buttons: [
            {
              type: "web_url",
              url: targetUrl,
              title: "ดูรายละเอียดหน้าเพจ"
            }
          ]
        }
      }
    };
    await callSendAPI(sender_psid, buttonPayload, page_id);
    return;
  }

  // 6. ดักถามรสชาติเมนู
  if (text.includes('รสชาติ') || text.includes('มีรสอะไร') || text.includes('รสอะไรบ้าง') || text.includes('รสไหน')) {
    const flavorText = "ขอแนะนำเมนูยอดฮิตจากทางร้านค่ะ\n-กลูแคนสกาย\n-สตอเบอร์รี่ โยเกิร์ต\n-บลูเบอร์รี่ โยเกิร์ต\n-ดับเบิ้ล ช็อกโกแลต\n-โปรตีน มอคค่า\n-โปรตีน เพียวมัทฉะ\n-คอลลาเจน อเมริกาโน่\n-คอลลาเจน บิวตี้รีเฟรช ค่าาา";
    await callSendAPI(sender_psid, { text: flavorText }, page_id);
    return;
  }

  // 7. ข้อความอื่นๆ ส่งให้ Gemini AI ประมวลผล
  const aiReply = await getAIReply(received_message.text);
  await callSendAPI(sender_psid, { text: aiReply }, page_id);
}

// =========================================================================
// 🛠 ฟังก์ชันสำหรับส่งรายละเอียดบัญชี + รูปภาพ QR Code จากหน้าแรก GitHub
// =========================================================================
async function sendPaymentInfo(sender_psid, page_id) {
  const payment = PAYMENT_DETAILS[page_id] || Object.values(PAYMENT_DETAILS)[0];

  if (payment) {
    // 1. ส่งข้อความแจ้งเลขบัญชีและชื่อบัญชี
    const textMsg = `รายละเอียดการชำระเงินค่ะ ✨\n\n📌 ธนาคาร: ${payment.bankName}\n📌 ชื่อบัญชี: ${payment.accountName}\n📌 เลขที่บัญชี: ${payment.accountNumber}\n\nโอนเงินแล้วแจ้งสลิปในแชทนี้ได้เลยนะคะ ❤️`;
    await callSendAPI(sender_psid, { text: textMsg }, page_id);

    // 2. ส่งรูปภาพ QR Code (ใช้ URL ตรงจาก payment.qrImage)
    if (payment.qrImage) {
      const imagePayload = {
        attachment: {
          type: "image",
          payload: {
            url: payment.qrImage, // ✅ ส่ง URL รูปตรงไปให้ Facebook ได้เลย
            is_reusable: true
          }
        }
      };
      await callSendAPI(sender_psid, imagePayload, page_id);
    }
  }
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
