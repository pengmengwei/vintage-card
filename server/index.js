
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increase limit for base64 images

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.warn("WARNING: RESEND_API_KEY is missing in .env file.");
}

const resend = new Resend(RESEND_API_KEY);

app.post('/api/send-email', async (req, res) => {
    try {
        const { toEmail, toName, fromName, message, image } = req.body;

        if (!toEmail || !toName || !fromName || !message || !image) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Read HTML template
        let htmlTemplate = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        // Prepare Image Source
        let imageSrc = image;
        const attachments = [];

        // If image is base64, we can attach it and use CID, or just use base64 in src (less reliable)
        // Using CID is better for email clients.
        if (image.startsWith('data:image')) {
            const base64Data = image.split(';base64,').pop();
            attachments.push({
                filename: 'card.png',
                content: Buffer.from(base64Data, 'base64'),
                content_id: 'card-image' // CID reference
            });
            imageSrc = 'cid:card-image';
        }

        // Replace Placeholders
        // Simple replaceAll implementation using split/join or global regex
        htmlTemplate = htmlTemplate.replace(/\[Recipient Name\]/g, toName);
        htmlTemplate = htmlTemplate.replace(/\[Sender Name\]/g, fromName);
        
        // Replace Image Placeholder
        // Use regex to match content between markers to preserve structure
        const imagePlaceholderRegex = /<!-- IMAGE_START -->[\s\S]*?<!-- IMAGE_END -->/;
        const newImageHtml = `
            <!-- IMAGE_START -->
            <div class="image-frame" style="padding: 0; background: none; border: 3px double #1C4E4F; border-radius: 16px; overflow: hidden;">
                <img src="${imageSrc}" alt="Vintage Card" style="width: 100%; height: auto; display: block; border-radius: 14px;" />
            </div>
            <!-- IMAGE_END -->
        `;
        htmlTemplate = htmlTemplate.replace(imagePlaceholderRegex, newImageHtml);

        // Replace Message Placeholder
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
        htmlTemplate = htmlTemplate.replace(messagePlaceholderRegex, newMessageHtml);

        // Send Email
        const data = await resend.emails.send({
            from: 'Happy New Year <gift@terrypmw.com>', // Updated to your custom domain
            to: [toEmail],
            subject: `A Vintage Greeting Card from ${fromName}`,
            html: htmlTemplate,
            attachments: attachments
        });

        if (data.error) {
             console.error("Resend API Error:", data.error);
             return res.status(500).json({ error: data.error.message });
        }

        res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
