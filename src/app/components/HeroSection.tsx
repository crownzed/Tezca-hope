import { Link } from 'react-router';
import { MessageCircle, Sparkles } from 'lucide-react';
import { ROUTES } from '../routes';

export function HeroSection() {
  return (
    <section id="hero" className="px-6 py-24 md:py-32 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)' }}>
              <Sparkles size={16} style={{ color: '#2DD4BF' }} />
              <span className="text-sm font-medium" style={{ color: '#2DD4BF' }}>
                AI-Powered Wellness
              </span>
            </div>
            
            <h1 
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
              style={{ color: '#1A202C' }}
            >
              Sức khỏe của bạn.<br />
              Được thấu hiểu.<br />
              Được chăm sóc.
            </h1>
            
            <p className="text-xl md:text-2xl leading-relaxed opacity-60" style={{ color: '#1A202C' }}>
              Trợ lý AI thấu cảm kết hợp chuyên gia y tế. Theo dõi dinh dưỡng, sức khỏe tinh thần và nhận tư vấn 24/7.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={ROUTES.app.chat}
                className="px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3"
                style={{ backgroundColor: '#2DD4BF', color: '#1A202C' }}
              >
                <MessageCircle size={24} />
                Trò chuyện ẩn danh ngay
              </Link>
              
              <Link
                to={ROUTES.app.root}
                className="px-8 py-4 rounded-full text-lg font-medium transition-all hover:bg-opacity-10 inline-flex items-center justify-center"
                style={{ backgroundColor: 'transparent', color: '#1A202C', border: '2px solid rgba(26, 32, 44, 0.1)' }}
              >
                Vào ứng dụng
              </Link>
            </div>
            
            {/* Stats */}
            <div className="flex gap-8 pt-8">
              <div>
                <div className="text-3xl font-bold" style={{ color: '#1A202C' }}>100%</div>
                <Link
                  to={ROUTES.product.security}
                  className="text-sm opacity-50 hover:opacity-80 transition-opacity block mt-0.5"
                  style={{ color: '#1A202C' }}
                >
                  Bảo mật
                </Link>
              </div>
              <div>
                <div className="text-3xl font-bold" style={{ color: '#1A202C' }}>24/7</div>
                <div className="text-sm opacity-50" style={{ color: '#1A202C' }}>Hỗ trợ AI</div>
              </div>
              <div>
                <div className="text-3xl font-bold" style={{ color: '#1A202C' }}>Miễn phí</div>
                <div className="text-sm opacity-50" style={{ color: '#1A202C' }}>Để bắt đầu</div>
              </div>
            </div>
          </div>
          
          {/* Right - iPhone Mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative" style={{ perspective: '1000px' }}>
              {/* 3D iPhone */}
              <div 
                className="relative w-[320px] transition-transform duration-300"
                style={{ 
                  transform: 'rotateY(-5deg) rotateX(2deg)',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Device Frame */}
                <div 
                  className="rounded-[3rem] p-3 shadow-2xl relative"
                  style={{ 
                    backgroundColor: '#1A202C',
                    boxShadow: '0 50px 100px -20px rgba(26, 32, 44, 0.3), 0 30px 60px -30px rgba(45, 212, 191, 0.2)'
                  }}
                >
                  {/* Dynamic Island */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-full z-20"></div>
                  
                  {/* Screen */}
                  <div className="rounded-[2.5rem] overflow-hidden relative" style={{ aspectRatio: '9/19.5', backgroundColor: '#F9F9FB' }}>
                    {/* Status Bar */}
                    <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-8 pt-4 z-10">
                      <span className="text-xs font-semibold" style={{ color: '#1A202C' }}>9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4" style={{ color: '#1A202C' }}>📶</div>
                        <div className="w-4 h-4" style={{ color: '#1A202C' }}>🔋</div>
                      </div>
                    </div>
                    
                    {/* App Content */}
                    <div className="h-full flex flex-col pt-16">
                      {/* Chat Header - Glassmorphism */}
                      <div 
                        className="px-6 py-4 backdrop-blur-xl border-b"
                        style={{ 
                          backgroundColor: 'rgba(249, 249, 251, 0.8)',
                          borderColor: 'rgba(26, 32, 44, 0.1)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ 
                              background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)'
                            }}
                          >
                            <span className="text-lg">✨</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: '#1A202C' }}>Tezca AI</div>
                            <div className="text-xs" style={{ color: '#2DD4BF' }}>Đang hoạt động</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Messages */}
                      <div className="flex-1 px-4 py-6 space-y-4 overflow-hidden">
                        {/* User Message */}
                        <div className="flex justify-end">
                          <div 
                            className="px-4 py-3 rounded-3xl rounded-tr-lg max-w-[75%]"
                            style={{ 
                              background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                              color: 'white'
                            }}
                          >
                            <p className="text-sm">Mình vừa ăn phở gà với trứng 🍜</p>
                          </div>
                        </div>
                        
                        {/* AI Response - Glassmorphism Card */}
                        <div className="flex justify-start">
                          <div 
                            className="p-4 rounded-3xl rounded-tl-lg max-w-[85%] backdrop-blur-xl border"
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderColor: 'rgba(45, 212, 191, 0.2)',
                              boxShadow: '0 8px 32px rgba(45, 212, 191, 0.1)'
                            }}
                          >
                            <p className="text-sm mb-3 font-medium" style={{ color: '#1A202C' }}>
                              Tuyệt vời! Đã ghi nhận 💚
                            </p>
                            
                            {/* Macro Card */}
                            <div className="p-3 rounded-2xl mb-3" style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)' }}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold" style={{ color: '#1A202C' }}>Phở gà</span>
                                <span className="text-xs font-bold" style={{ color: '#2DD4BF' }}>350 cal</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold" style={{ color: '#1A202C' }}>Trứng luộc</span>
                                <span className="text-xs font-bold" style={{ color: '#2DD4BF' }}>70 cal</span>
                              </div>
                            </div>
                            
                            {/* Total */}
                            <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'rgba(45, 212, 191, 0.2)' }}>
                              <span className="text-xs font-bold" style={{ color: '#1A202C' }}>Tổng cộng</span>
                              <span className="text-sm font-bold" style={{ color: '#2DD4BF' }}>420 cal</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Mood Check */}
                        <div className="flex justify-start">
                          <div 
                            className="px-4 py-3 rounded-3xl rounded-tl-lg backdrop-blur-xl border"
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderColor: 'rgba(45, 212, 191, 0.2)'
                            }}
                          >
                            <p className="text-sm" style={{ color: '#1A202C' }}>
                              Hôm nay bạn cảm thấy thế nào? 🌸
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Glow Effect */}
                <div 
                  className="absolute inset-0 -z-10 blur-3xl opacity-30 rounded-[3rem]"
                  style={{ backgroundColor: '#2DD4BF' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
