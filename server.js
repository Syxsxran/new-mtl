require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true
});


// ฟังก์ชันแปลงตัวเลขเป็นไทยพร้อมตัวคั่น
function digitToThaiWithSeparator(input) {
  const thaiDigits = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
  return input.toString().split('').map(ch => thaiDigits[parseInt(ch)]).join(' | ');
}

// ฟังก์ชันแปลงเลขใน policy_name เป็นไทย พร้อม 'ทับ'
function convertPolicyName(input) {
  const thaiDigits = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (/\d/.test(ch)) result += thaiDigits[parseInt(ch)] + ' | ';
    else if (ch === '/') result += 'ทับ | ';
    else result += ch;
  }
  return result.replace(/\s\|\s$/, '').replace(/\s{2,}/g, ' ');
}

// ฟังก์ชันแปลงวันที่ไทย
function formatThaiDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const monthName = thaiMonths[parseInt(month)];
  return `${parseInt(day)} ${monthName} ${year}`;
}

// เชื่อมต่อ MongoDB ครั้งเดียว
(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB.');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // หยุด server หากเชื่อมไม่ติด
  }
})();

// API Endpoint
app.get('/data', async (req, res) => {
  const phoneParam = req.query.phone;
  if (!phoneParam) {
    return res.status(400).json({ error: 'กรุณาระบุหมายเลขโทรศัพท์ (phone)' });
  }

  try {
    const db = client.db('mydb-MTL');
    const collection = db.collection('MTL-data');
    const rowData = await collection.findOne({ phone: phoneParam });

    if (!rowData) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลสำหรับเบอร์นี้' });
    }

    const result = {
      phone: digitToThaiWithSeparator(rowData.phone),
      policy_name: convertPolicyName(rowData.policy_name),
      due_date: formatThaiDate(rowData.due_date),
      customer_name: rowData.customer_name,
      payment_year: rowData.payment_year,
      policy_period: rowData.policy_period,
      apl: rowData.apl,
      due_amount: rowData.due_amount,
      customer_info: rowData.customer_info,
      customer_type: rowData.customer_type
    };

    return res.json(result);
  } catch (err) {
    console.error('Error fetching data:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// เริ่มต้น Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
