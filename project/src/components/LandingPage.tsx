import React, { useState } from 'react';
import { TrendingUp, MessageCircle, Star, CheckCircle, ArrowRight, BarChart3, Zap, Target, Award, Shield, Users, Clock, Activity, AlertTriangle, Ban, ShieldCheck, PieChart } from 'lucide-react';
import { useContent } from '../contexts/ContentContext';
import { Package } from '../types';
import { DiscordIdModal } from './DiscordIdModal';

const iconMap: { [key: string]: React.ReactNode } = {
    TrendingUp: <TrendingUp className="w-8 h-8" />, Target: <Target className="w-8 h-8" />, Shield: <Shield className="w-8 h-8" />,
    BarChart3: <BarChart3 className="w-8 h-8" />, Zap: <Zap className="w-8 h-8" />, Award: <Award className="w-8 h-8" />,
    Users: <Users className="w-8 h-8" />, Clock: <Clock className="w-8 h-8" />, CheckCircle: <CheckCircle className="w-8 h-8" />,
    Star: <Star className="w-8 h-8" />, MessageCircle: <MessageCircle className="w-8 h-8" />, Activity: <Activity className="w-8 h-8" />,
};

const LandingPage: React.FC = () => {
  const { heroContent, features, packages, isLoading, error } = useContent();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const handlePurchaseClick = (pkg: Package) => {
    if (!pkg.payment_link) {
      alert('This package is not yet available.');
      return;
    }
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white"><p>Loading...</p></div>;
  }
  
  if (error || !heroContent) {
    return <div className="min-h-screen flex items-center justify-center text-red-400"><p>Error: {error || "Failed to load content."}</p></div>;
  }

  const whatsappLink = `https://wa.me/${heroContent.whatsappNumber}?text=Hello, I'm interested`;

  return (
    <div className="min-h-screen bg-background-dark font-sans text-gray-300">
      <main className="relative z-10">
        <section className="relative min-h-screen flex items-center justify-center px-4">
            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <h1 className="text-4xl sm:text-7xl font-black text-white mb-6">{heroContent.title}</h1>
                <p className="text-xl text-gray-400 mb-8">{heroContent.description}</p>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-500 text-white px-8 py-4 rounded-lg font-semibold">
                    <MessageCircle /> Ask via WhatsApp
                </a>
            </div>
        </section>

        {packages.length > 0 && (
            <section id="packages" className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-bold text-white">Choose Your Plan</h2>
                        <p className="text-xl text-gray-400 mt-4">Select the package that best suits your needs.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {packages.map((pkg) => (
                            <div key={pkg.id} className={`relative flex flex-col bg-card-dark rounded-2xl p-8 border ${pkg.popular ? 'border-neon-pink' : 'border-border-dark'}`}>
                                {pkg.popular && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-neon-pink text-black px-4 py-2 rounded-full text-sm font-bold">MOST POPULAR</div>}
                                <div className="flex-grow">
                                    <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                                    <div className="text-4xl font-black text-neon-cyan mb-2">${pkg.price}</div>
                                    <p className="text-gray-400 h-12">{pkg.description}</p>
                                    <div className="space-y-4 my-8">
                                        {pkg.features.map((feature, i) => (<div key={i} className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-neon-cyan" /> <span>{feature}</span></div>))}
                                    </div>
                                </div>
                                <button onClick={() => handlePurchaseClick(pkg)} className={`block w-full text-center py-3 px-6 rounded-lg font-bold mt-auto ${pkg.payment_link ? (pkg.popular ? 'bg-neon-pink text-black' : 'bg-neon-cyan text-black') : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`} disabled={!pkg.payment_link}>
                                    {pkg.payment_link ? 'Get This Package' : 'Coming Soon'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}
      </main>
      {isModalOpen && selectedPackage && (
        <DiscordIdModal pkg={selectedPackage} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default LandingPage;
