import { MessageCircle, TrendingUp, Calendar } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="tinh-nang" className="px-6 py-24 md:py-32 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight" style={{ color: '#1A202C' }}>
            Tất cả những gì bạn cần
          </h2>
          <p className="text-xl opacity-60 max-w-2xl mx-auto" style={{ color: '#1A202C' }}>
            Một nền tảng toàn diện cho sức khỏe thể chất và tinh thần
          </p>
        </div>
        
        {/* Bento Grid */}
        <div className="grid md:grid-cols-12 gap-6">
          {/* Large Card - AI Chatbot */}
          <div 
            className="md:col-span-7 p-10 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
            style={{ 
              background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.1) 0%, rgba(20, 184, 166, 0.05) 100%)',
              border: '1px solid rgba(45, 212, 191, 0.2)',
              boxShadow: '0 20px 60px -15px rgba(45, 212, 191, 0.15)'
            }}
          >
            {/* Decorative gradient blob */}
            <div 
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: '#2DD4BF' }}
            ></div>
            
            <div className="relative z-10">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: '#2DD4BF' }}
              >
                <MessageCircle size={28} style={{ color: 'white' }} />
              </div>
              
              <h3 className="text-3xl font-bold mb-4" style={{ color: '#1A202C' }}>
                AI Chatbot Tâm giao
              </h3>
              
              <p className="text-lg opacity-70 mb-8 leading-relaxed" style={{ color: '#1A202C' }}>
                Trò chuyện tự do, chia sẻ tâm sư mà không lo bị phán xét. Tezca AI lắng nghe, thấu hiểu và đồng hành cùng bạn 24/7.
              </p>
              
              {/* Chat Preview */}
              <div className="space-y-3">
                <div 
                  className="p-4 rounded-2xl backdrop-blur-xl inline-block"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(26, 32, 44, 0.1)'
                  }}
                >
                  <p className="text-sm" style={{ color: '#1A202C' }}>
                    "Hôm nay mình cảm thấy hơi căng thẳng..."
                  </p>
                </div>
                <div 
                  className="p-4 rounded-2xl ml-8"
                  style={{ 
                    background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                    color: 'white'
                  }}
                >
                  <p className="text-sm">
                    Mình hiểu bạn đang trải qua giai đoạn khó khăn. Bạn có muốn chia sẻ thêm không? 💚
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Medium Card - Nutrition Tracker */}
          <div 
            className="md:col-span-5 p-8 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
            style={{ 
              backgroundColor: 'white',
              border: '1px solid rgba(26, 32, 44, 0.08)',
              boxShadow: '0 20px 60px -15px rgba(26, 32, 44, 0.1)'
            }}
          >
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ 
                background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)'
              }}
            >
              <TrendingUp size={28} style={{ color: 'white' }} />
            </div>
            
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#1A202C' }}>
              Nutrition Tracker
            </h3>
            
            <p className="text-sm opacity-70 mb-6 leading-relaxed" style={{ color: '#1A202C' }}>
              Nhắn tin món ăn, AI tự động tính toán dinh dưỡng và thiết kế thực đơn cá nhân hóa.
            </p>
            
            {/* Circular Progress */}
            <div className="flex justify-center items-center py-8">
              <div className="relative w-40 h-40">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="rgba(45, 212, 191, 0.1)"
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#2DD4BF"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray="440"
                    strokeDashoffset="110"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold" style={{ color: '#1A202C' }}>1,420</div>
                  <div className="text-xs opacity-50" style={{ color: '#1A202C' }}>/ 2,000 cal</div>
                  <div className="text-xs font-semibold mt-1" style={{ color: '#2DD4BF' }}>71%</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Medium Card - Premium Care */}
          <div 
            className="md:col-span-5 p-8 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
            style={{ 
              backgroundColor: 'white',
              border: '1px solid rgba(26, 32, 44, 0.08)',
              boxShadow: '0 20px 60px -15px rgba(26, 32, 44, 0.1)'
            }}
          >
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ 
                background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)'
              }}
            >
              <Calendar size={28} style={{ color: 'white' }} />
            </div>
            
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#1A202C' }}>
              Premium Care
            </h3>
            
            <p className="text-sm opacity-70 mb-6 leading-relaxed" style={{ color: '#1A202C' }}>
              Kết nối trực tiếp với đội ngũ chuyên gia y tế và tâm lý. Đặt lịch tư vấn 1-1 miễn phí.
            </p>
            
            {/* Booking UI Preview */}
            <div className="space-y-3">
              <div 
                className="p-4 rounded-2xl flex items-center gap-3"
                style={{ backgroundColor: 'rgba(45, 212, 191, 0.05)' }}
              >
                <div 
                  className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: '#2DD4BF' }}
                >
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    👨‍⚕️
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: '#1A202C' }}>
                    Dr. Nguyễn An
                  </div>
                  <div className="text-xs opacity-60" style={{ color: '#1A202C' }}>
                    Chuyên gia Dinh dưỡng
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <div 
                  className="flex-1 px-3 py-2 rounded-xl text-center text-xs font-medium"
                  style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)', color: '#2DD4BF' }}
                >
                  T2, 14:00
                </div>
                <div 
                  className="flex-1 px-3 py-2 rounded-xl text-center text-xs font-medium"
                  style={{ backgroundColor: '#2DD4BF', color: 'white' }}
                >
                  T4, 10:00
                </div>
                <div 
                  className="flex-1 px-3 py-2 rounded-xl text-center text-xs font-medium"
                  style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)', color: '#2DD4BF' }}
                >
                  T6, 16:00
                </div>
              </div>
            </div>
          </div>
          
          {/* Large Card - Mental Wellness */}
          <div 
            className="md:col-span-7 p-10 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
            style={{ 
              background: 'linear-gradient(135deg, #1A202C 0%, #2D3748 100%)',
              boxShadow: '0 20px 60px -15px rgba(26, 32, 44, 0.3)'
            }}
          >
            <div className="relative z-10">
              <div className="text-5xl mb-6">🧘‍♀️</div>
              
              <h3 className="text-3xl font-bold mb-4 text-white">
                Hành trình Sức khỏe Tinh thần
              </h3>
              
              <p className="text-lg opacity-70 mb-8 leading-relaxed text-white">
                Theo dõi cảm xúc hàng ngày, nhận gợi ý thiền định và các bài tập thư giãn được cá nhân hóa.
              </p>
              
              {/* Mood Chart Preview */}
              <div className="flex items-end gap-2 h-24">
                {[40, 65, 45, 80, 70, 85, 60].map((height, index) => (
                  <div 
                    key={index}
                    className="flex-1 rounded-t-lg transition-all"
                    style={{ 
                      height: `${height}%`,
                      background: index === 5 ? '#2DD4BF' : 'rgba(45, 212, 191, 0.3)'
                    }}
                  ></div>
                ))}
              </div>
              
              <div className="flex justify-between mt-2 text-xs opacity-40 text-white">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
