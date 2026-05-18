import { Shield, Brain, Users } from 'lucide-react';

export function SocialProofBar() {
  const proofs = [
    {
      icon: Shield,
      text: 'Mã hóa đầu cuối 100%'
    },
    {
      icon: Brain,
      text: 'Phân tích bởi AI'
    },
    {
      icon: Users,
      text: 'Hỗ trợ bởi Chuyên gia'
    }
  ];

  return (
    <section className="px-6 py-8 border-y" style={{ borderColor: 'rgba(26, 32, 44, 0.08)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
          {proofs.map((proof, index) => (
            <div key={index} className="flex items-center gap-3">
              <proof.icon size={20} style={{ color: '#2DD4BF' }} />
              <span className="text-sm font-medium opacity-70" style={{ color: '#1A202C' }}>
                {proof.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
