require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = 3000;

// ใช้ตัวแปร MONGO_URI จาก .env
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

function digitToThaiWithSeparator(input) {
  const thaiDigits = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
  return input.toString().split('').map(ch => thaiDigits[parseInt(ch)]).join(' | ');
}

function convertPolicyName(input) {
  const thaiDigits = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (/\d/.test(ch)) result += thaiDigits[parseInt(ch)] + ' | ';
    else if (ch === '/') result += 'ทับ |';
    else result += ch;
  }
  return result.replace(/\s\|\s$/, '').replace(/\s{2,}/g, ' ');
}

function formatThaiDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const monthName = thaiMonths[parseInt(month)];
  return `${parseInt(day)} ${monthName} ${year}`;
}

app.get('/data', async (req, res) => {
    const phoneParam = req.query.phone;
    if (!phoneParam) {
      console.log('Phone parameter is missing.');
      return res.status(400).json({ error: 'กรุณาระบุหมายเลขโทรศัพท์ (phone)' });
    }

    try {
      // เชื่อมต่อ MongoDB
      console.log('Connecting to MongoDB...');
      await client.connect();
      console.log('Connected to MongoDB successfully.');

      const db = client.db('mydb-MTL'); // ชื่อฐานข้อมูล
      const collection = db.collection('MTL-data'); // ชื่อ collection

      // ดึงข้อมูลจาก MongoDB
      console.log(`Finding data for phone: ${phoneParam}`);
      const rowData = await collection.findOne({ phone: phoneParam });
      
      if (!rowData) {
        console.log('No data found for the phone:', phoneParam);
        return res.status(404).json({ error: 'ไม่พบข้อมูลสำหรับเบอร์นี้' });
      }

      console.log('Data fetched:', rowData);

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
      console.error('Error in fetching data:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    } finally {
      await client.close();
    }
});


  

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
