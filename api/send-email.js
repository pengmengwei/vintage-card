import { Resend } from 'resend';
import { htmlTemplate } from './template.js';

export default async function handler(req, res) {
    // Enable CORS if needed (good practice for APIs)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // another common pattern
    // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
        return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
    }

    const resend = new Resend(RESEND_API_KEY);

    try {
        const { toEmail, toName, fromName, message, image } = req.body;

        if (!toEmail || !toName || !fromName || !message || !image) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let template = htmlTemplate;

        // Prepare Image Source
        let imageSrc = image;
        const attachments = [];

        if (image.startsWith('data:image')) {
            const base64Data = image.split(';base64,').pop();
            attachments.push({
                filename: 'card.png',
                content: Buffer.from(base64Data, 'base64'),
                content_id: 'card-image'
            });
            imageSrc = 'cid:card-image';
        }

        // Replace Placeholders
        template = template.replace(/\[Recipient Name\]/g, toName);
        template = template.replace(/\[Sender Name\]/g, fromName);

        const imagePlaceholderRegex = /<!-- IMAGE_START -->[\s\S]*?<!-- IMAGE_END -->/;
        const newImageHtml = `
            <!-- IMAGE_START -->
            <div class="image-frame" style="padding: 0; background: none; border: 3px double #1C4E4F; border-radius: 16px; overflow: hidden;">
                <img src="${imageSrc}" alt="Vintage Card" style="width: 100%; height: auto; display: block; border-radius: 14px;" />
            </div>
            <!-- IMAGE_END -->
        `;
        template = template.replace(imagePlaceholderRegex, newImageHtml);

        const messagePlaceholderRegex = /<!-- MESSAGE_START -->[\s\S]*?<!-- MESSAGE_END -->/;
        const newMessageHtml = `
            <!-- MESSAGE_START -->
            <div class="lines-container" style="background-color: rgba(249, 249, 249, 0.6); border-radius: 8px; padding: 15px; margin-top: 10px;">
                <div style="font-family: 'Handwritten', cursive; font-size: 18px; font-weight: 600; color: #1C4E4F; line-height: 1.6; text-align: center; text-shadow: 1px 1px 0px rgba(232, 220, 202, 0.5);">
                    ${message.replace(/\n/g, '<br/>')}
                </div>
            </div>
            <!-- MESSAGE_END -->
        `;
        template = template.replace(messagePlaceholderRegex, newMessageHtml);

        const data = await resend.emails.send({
            from: 'Happy New Year <gift@terrypmw.com>',
            to: [toEmail],
            subject: `A Vintage Greeting Card from ${fromName}`,
            html: template,
            attachments: attachments
        });

        if (data.error) {
            console.error("Resend API Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Handler Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
