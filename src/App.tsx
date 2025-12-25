import React, { useState } from 'react';
import { generateSeedreamPoster } from './lib/seedream';
import { toast, Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';

function App() {
  const seedreamApiKey = import.meta.env.VITE_SEEDREAM_API_KEY;
  const seedreamEndpoint = import.meta.env.VITE_SEEDREAM_ENDPOINT_ID; // e.g. ep-xxxx

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Form State
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [toName, setToName] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setError(null);
  };

  const handleClear = () => {
    setSelectedImage(null);
    setResultUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExternalUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleExternalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    
    // Check API Key
    if (!seedreamApiKey) {
        setError("Seedream API Key (Access Key) is missing.");
        return;
    }
    if (!seedreamEndpoint) {
        setError("Seedream Endpoint ID (e.g. ep-2025...) is missing.");
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = await generateSeedreamPoster(selectedImage, seedreamApiKey, seedreamEndpoint);
      setResultUrl(url);

      // Save to Supabase
      console.log("Attempting to save to Supabase...");
      try {
        const { data, error: dbError } = await supabase
          .from('cards')
          .insert([
            {
              sender_name: fromName || null,
              recipient_name: toName || null,
              message: message || null,
              image_url: url,
              style: '1920s'
            }
          ])
          .select();

        if (dbError) {
          console.error("Failed to save to history:", dbError);
          toast.error(`Saving failed: ${dbError.message}`);
        } else {
          console.log("Card saved to history successfully!", data);
          toast.success("Saved to Gallery!");
        }
      } catch (dbErr) {
        console.error("Error saving to database:", dbErr);
        toast.error("Database connection error");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate poster. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `retro-poster-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleEmail = async () => {
    if (!resultUrl) {
        toast.error("请先生成贺卡 (Please generate a poster first)");
        return;
    }
    if (!toEmail || !toName) {
        toast.error("请填写收件人信息 (Please fill in recipient details)");
        return;
    }

    const toastId = toast.loading("正在发送邮件 (Sending email)...");

    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                toEmail,
                toName,
                fromName: fromName || "A Friend",
                message,
                image: resultUrl
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "发送失败 (Failed to send)");
        }

        toast.success("邮件发送成功! (Email sent successfully!)", { id: toastId });
    } catch (error: any) {
        console.error("Email send error:", error);
        toast.error(error.message || "发送失败 (Failed to send)", { id: toastId });
    }
  };

  return (
    <div className="main-container">
        <Toaster position="top-center" />
        {/* Corner decorations */}
        <div className="corner-deco corner-tl"></div>
        <div className="corner-deco corner-tr"></div>
        <div className="corner-deco corner-bl"></div>
        <div className="corner-deco corner-br"></div>

        <header>
            <h1>Treasure every moment we share</h1>
        </header>
        
        <div className="deco-line"></div>

        <div className="content-area">
            {/* Left Side: Image Placeholder */}
            <div className="left-column">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleExternalFileChange} 
                    style={{display: 'none'}}
                />
                
                <div className={`image-placeholder ${resultUrl || selectedImage ? 'has-image' : ''}`}>
                    {resultUrl ? (
                         <div className="relative w-full h-full flex items-center justify-center p-4 z-20">
                             <img src={resultUrl} alt="Generated Poster" className="max-h-full max-w-full object-contain shadow-lg" />
                             <button 
                                onClick={handleClear} 
                                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-black p-2 rounded-full shadow-sm z-30 flex items-center justify-center"
                                style={{cursor: 'pointer'}}
                             >
                                <i className="ri-refresh-line text-lg"></i>
                             </button>
                         </div>
                    ) : selectedImage ? (
                        <div className="relative w-full h-full flex items-center justify-center p-4 z-20">
                            <img 
                                src={URL.createObjectURL(selectedImage)} 
                                alt="Preview" 
                                className="max-h-full max-w-full object-contain" 
                            />
                             <button 
                                onClick={handleClear} 
                                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-black p-2 rounded-full shadow-sm z-30 flex items-center justify-center"
                                style={{cursor: 'pointer'}}
                             >
                                <i className="ri-refresh-line text-lg"></i>
                             </button>
                        </div>
                    ) : (
                        <div className="placeholder-text" onClick={handleExternalUploadClick} style={{cursor: 'pointer', zIndex: 20}}>
                            <i className="ri-image-add-line"></i>
                            <span>默认图片</span>
                            <span style={{fontSize: '18px', marginTop: '5px', opacity: 0.8}}>(Select an image to preview)</span>
                        </div>
                    )}
                    
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-30" style={{backgroundColor: 'rgba(242, 232, 213, 0.85)'}}>
                            <div className="relative mb-6">
                                <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-[var(--vintage-brown)] border-t-[var(--vintage-gold)]"></div>
                            </div>
                            <p style={{
                                fontFamily: "'ZCOOLXiaoWei', serif",
                                fontSize: '32px',
                                color: 'var(--vintage-red)',
                                letterSpacing: '2px',
                                textShadow: '1px 1px 0 rgba(255,255,255,0.5)'
                            }} className="animate-pulse">
                                Creating Magic...
                            </p>
                        </div>
                    )}
                </div>
                
                {/* Error Message */}
                {error && (
                    <div className="text-white bg-red-500/80 p-3 rounded-lg text-sm text-center mt-4 z-20 relative">
                        {error}
                    </div>
                )}
            </div>

            {/* Right Side: Form Inputs */}
            <div className="right-column">
                
                <div className="form-section">
                    <div className="section-title">From You</div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Name</label>
                            <input 
                                type="text" 
                                placeholder="Your Name"
                                value={fromName}
                                onChange={(e) => setFromName(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <input 
                                type="text" 
                                value="Happy New Year <gift@terrypmw.com>"
                                disabled
                                style={{ cursor: 'not-allowed', opacity: 0.7 }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <div className="section-title">To Someone Special</div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Name</label>
                            <input 
                                type="text" 
                                placeholder="Recipient Name"
                                value={toName}
                                onChange={(e) => setToName(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                placeholder="recipient@email.com"
                                value={toEmail}
                                onChange={(e) => setToEmail(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="message-area">
                    <label style={{fontSize: '24px', color: 'var(--vintage-red)', fontFamily: "'ZCOOLXiaoWei', serif", textTransform: 'none'}}>你的留言 Your Message</label>
                    <textarea 
                        placeholder="Write your heartfelt message here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                </div>
            </div>
        </div>

        <div className="footer">
            <button 
                className="btn btn-outline"
                onClick={handleExternalUploadClick}
                disabled={isLoading}
            >
                <i className="ri-upload-2-line"></i> 上传照片
            </button>
            <button 
                className="btn btn-secondary"
                onClick={handleGenerate}
                disabled={!selectedImage || isLoading}
            >
                <i className="ri-magic-line"></i> 生成贺片
            </button>
            <button 
                className="btn btn-tertiary"
                onClick={handleDownload}
                disabled={!resultUrl}
            >
                <i className="ri-save-3-line"></i> 保存贺卡
            </button>
            <button 
                className="btn"
                onClick={handleEmail}
                disabled={!resultUrl || isLoading}
            >
                <i className="ri-mail-send-line"></i> 发送邮件
            </button>
        </div>
    </div>
  );
}

export default App;