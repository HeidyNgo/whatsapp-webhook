async function getChatGPTResponse(userMessage) {
    if (!OPENAI_API_KEY) {
        return "AI feature is not configured. Please contact the administrator.";
    }
    const system_prompt = `
You are a professional, polite, and helpful virtual assistant for "LanXiangTCM", a Traditional Chinese Medicine (TCM) massage parlor in Singapore.
Your primary rule is to ALWAYS reply in the same language the user uses in their question.

Your knowledge is strictly limited to the information provided below.
- Business Name: LanXiangTCM
- Services & Prices:
    - Foot Massage - 30 mins - $15
    - Foot Massage - 40 mins - $20
    - Foot Massage - 60 mins - $25
    - Foot + Shoulder Massage - 40 mins - $20
    - Foot + Shoulder Massage - 60 mins - $25
    - Professional Pedicure - 30 mins - $30
    - Ear Candling - 30 mins - $30
    - Cupping / Scraping / Giác hơi / Cạo gió - 30 mins - $30
    - Body Massage - 30 mins - $30
    - Body Massage - 60 mins - $45
    - Body Massage - 90 mins - $70
    - Body Massage - 120 mins - $90
    * Combo: 30 mins foot + 30 mins body (60 mins total) - $35
    * Combo: 45 mins foot + 30 mins body (75 mins total) - $45
    * Combo: 45 mins foot + 45 mins body (90 mins total) - $50
    * Combo: 60 mins foot + 30 mins body (90 mins total) - $50
    * Combo: 30 mins foot + 60 mins body (90 mins total) - $55
    * Combo: 45 mins foot + 60 mins body (105 mins total) - $60
    * Combo: 60 mins foot + 60 mins body (120 mins total) - $65
- Address: 1 Park Road, People's Park Complex, Singapore 059108. Units: #03-73K, #03-28, #03-69, #03-29.
- Opening Hours: Monday - Sunday, 9:00 AM to 10:30 PM.
- Booking & Contact Phone: +65 9722 1681 / +65 87600151.
- Website: https://lanxiang-api.onrender.com/
- Booking Method: Customers can book via phone, walk-in, website, or ask for the QR code.
- QR Code Image URL: https://i.ibb.co/6gYryh3/QR-booking.png
- Receipts: "TCM receipts" can be issued.
- Detailed Service Descriptions:
    - TCM Body Massage: Promotes Qi circulation, balances Yin and Yang, relieves pain, muscle tension, stress, improves circulation and sleep. (In Chinese: 中医全身按摩 – 调和身心，疏通气血)
    - Foot Massage: Relieves fatigue, improves circulation, and stimulates acupressure points. (In Chinese: 足部按摩 – 深度放松，全面调养)
    - Heel Callus Removal: Gently removes thick, cracked skin on the heels. (In Chinese: 足跟去茧 – 柔嫩光滑)
    - Ear Cleaning with Endoscope: Uses a high-resolution camera to gently and precisely remove ear wax. (In Chinese: 可视采耳 – 深层清洁，安全放松)
    - Scraping & Cupping Therapy (Giác hơi / 刮痧 / 拔罐): Traditional therapies to relieve pain and detoxify.

Your rules are:
1. Answering Priority: If the user's question is about massage, services, prices, booking, or anything related to our business, you MUST use the information provided. For all other general knowledge questions, you can answer them freely as a helpful assistant.
2. Consultation: If a user describes aches/pains, analyze it and suggest a suitable service (e.g., body ache -> TCM Body Massage).
3. Upsell: If a user asks for recommendations or good value, suggest the "Combo" packages.
4. Map Link: When asked for the address, provide it and then ask "Would you like a map link?". If they agree, reply ONLY with this link: https://www.google.com/maps/search/?api=1&query=1+Park+Road,+People's+Park+Complex,+Singapore+059108
    `;

    try {

 const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [
                { "role": "system", "content": system_prompt.trim() },
                { "role": "user", "content": userMessage }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error calling OpenAI:", error.response ? error.response.data : error.message);
        return "Sorry, the AI assistant is currently unavailable.";
    }
}
async function findAndSendPriorityMasseuse(to, gender = '', exclude = '') {
    let apiUrl = `${SHEET_API_URL}?action=free`;
    if (gender) {
        let genderEn = gender.toLowerCase();
        if (genderEn === '男') genderEn = 'male';
        if (genderEn === '女') genderEn = 'female';
        apiUrl += `&gender=${genderEn}`;
    }
    if (exclude) {
        apiUrl += `&exclude=${encodeURIComponent(exclude)}`;
    }
    const response = await axios.get(apiUrl);
    const technician = response.data.data;
    if (technician.name) {
        await sendButtonMessage(to, technician.name);
    } else {
        await sendTextMessage(to, technician.message);
    }
}

functions.http('handleWebhook', async (req, res) => {
    if (req.method === 'GET' && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
        return res.status(200).send(req.query['hub.challenge']);
    }

    if (req.method === 'POST') {
        const body = req.body;
        const value = body.entry?.[0]?.changes?.[0]?.value;
        if (value && value.messages && value.messages[0]) {
            const message = value.messages[0];
            const from = message.from;
            try {
                if (message.type === 'text') {
                    const msg_body = message.text.body.trim();
                    const msg_body_lower = msg_body.toLowerCase();
                    let apiUrl = '';
                    let commandHandled = false;
                    
                    const parts = msg_body.split(/\s+/);
                    const command = parts[0].toLowerCase();
                    const arguments = parts.length > 1 ? parts.slice(1).join(' ') : '';
                    
                    // --- BỘ PHÂN TÍCH LỆNH MỚI, THÔNG MINH HƠN ---
                    
                    // Ưu tiên 1: Các lệnh đơn giản nhất
                    if (msg_body_lower === 'free' || msg_body_lower === '空闲') {
                        await findAndSendPriorityMasseuse(from, '');
                        commandHandled = true;
                    } else if (msg_body_lower === 'male' || msg_body_lower === '男') {
                        await findAndSendPriorityMasseuse(from, 'male');
                        commandHandled = true;
                    } else if (msg_body_lower === 'female' || msg_body_lower === '女') {
                        await findAndSendPriorityMasseuse(from, 'female');
                        commandHandled = true;
                    } else if (msg_body_lower === 'help' || msg_body_lower === '帮助') {
                        const helpMessage = "*--- CHECK-IN / 签到 ---*\n" + "• `[Name] male`\n" + "• `[Name] female`\n\n" + "*--- SHIFT MANAGEMENT / 班次管理 ---*\n" + "• `free` / `male` / `female`\n" + "• `start [Name]` / `工作 [名字]`\n" + "• `finish [Name]` / `下班 [名字]`\n\n" + "*--- REPORTING / 报告 ---*\n" + "• `status all` / `total today`";
                        await sendTextMessage(from, helpMessage);
                        commandHandled = true;
                    }

                    // Ưu tiên 2: Các lệnh có tham số
                    if (!commandHandled) {
                        switch (command) {
                            case 'status':
                                if (arguments.toLowerCase() === 'all' || arguments === '全部') {
                                    apiUrl = `${SHEET_API_URL}?action=statusall`;
                                }
                                break;
                            case 'total':
                                if (arguments.toLowerCase() === 'today' || arguments === '今日') {
                                    apiUrl = `${SHEET_API_URL}?action=totaltoday`;
                                }
                                break;
                            case 'start':
                            case '工作':
                                if (arguments) apiUrl = `${SHEET_API_URL}?action=start&name=${encodeURIComponent(arguments)}`;
                                break;
                            case 'finish':
                            case '下班':
                                if (arguments) apiUrl = `${SHEET_API_URL}?action=finish&name=${encodeURIComponent(arguments)}`;
                                break;
                        }
                    }

                    // Ưu tiên 3: Nếu không phải lệnh trên, xét đến check-in
                    if (!apiUrl && !commandHandled) {
                        const lastPart = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
                        if (parts.length >= 2 && ['male', 'female', '男', '女'].includes(lastPart)) {
                            const gender = (lastPart === '男') ? 'male' : (lastPart === '女') ? 'female' : lastPart;
                            const name = parts.slice(0, -1).join(' ');
                            apiUrl = `${SHEET_API_URL}?action=checkin&name=${encodeURIComponent(name)}&gender=${gender}`;
                        }
                    }

                    // Thực thi nếu tìm thấy lệnh
                    if (apiUrl) {
                        const response = await axios.get(apiUrl);
                        await sendTextMessage(from, response.data.data.message);
                    } else if (!commandHandled) {
                        // Cuối cùng: Nếu không phải tất cả các lệnh trên, gửi đến ChatGPT
                        const aiResponse = await getChatGPTResponse(msg_body);
                        await sendTextMessage(from, aiResponse);
                    }
                
                // Xử lý khi người dùng nhấn vào nút bấm
                } else if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
                    const button_id = message.interactive.button_reply.id;
                    const [action, name] = button_id.split('_');
                    if (action === 'start' && name) {
                        const apiUrl = `${SHEET_API_URL}?action=start&name=${encodeURIComponent(name)}`;
                        const response = await axios.get(apiUrl);
                        await sendTextMessage(from, response.data.data.message);
                    } else if (action === 'skip' && name) {
                        await sendTextMessage(from, `Skipped ${name}. Finding next available... / 已跳过 ${name}。正在寻找下一位...`);
                        await findAndSendPriorityMasseuse(from, '', name);
                    }
                }
            } catch (error) {
                const errorMessage = error.response ? error.response.data.message : "An internal error occurred.";
                await sendTextMessage(from, `Error: ${errorMessage}`);
            }
        }
        return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(403).send('Forbidden');
});

async function sendTextMessage(to, text) {
    const payload = {
        messaging_product: 'whatsapp',
        to: to,
        text: { "body": text, "preview_url": false },
    };
    await sendWhatsAppRequest(payload);
}
async function sendButtonMessage(to, technicianName) {
    const payload = {
        messaging_product: "whatsapp",
        to: to,
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: `Next available: / 下一位: ${technicianName}` },
            action: {
                buttons: [
                    { type: "reply", reply: { id: `start_${technicianName}`, title: "Start / 工作" } },
                    { type: "reply", reply: { id: `skip_${technicianName}`, title: "Skip / 跳过" } }
                ]
            }
        }
    };
    await sendWhatsAppRequest(payload);
}
async function sendWhatsAppRequest(payload) {
    try {
        await axios.post(WHATSAPP_API_URL, payload, {
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response ? JSON.stringify(error.response.data) : error.message);
    }
}


