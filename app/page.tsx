'use client';

import { useState } from 'react';
import { Heart, Plus, User, CreditCard, Clock } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'feed' | 'sell' | 'profile'>('feed');
  const [vibeBalance] = useState(248);

  const items = [
    { id: 1, title: "Culotte dentelle rouge portée 3 jours", price: 82, timeLeft: "47 min", bids: 14 },
    { id: 2, title: "Chaussettes noires de sport 5 jours", price: 38, timeLeft: "3h 12min", bids: 9 },
    { id: 3, title: "Ensemble lingerie noire", price: 165, timeLeft: "1j 4h", bids: 22 },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
    {/* Header */}
    <header className="fixed top-0 left-0 right-0 bg-black border-b border-pink-600 z-50">
    <div className="max-w-2xl mx-auto px-6 py-5 flex justify-between items-center">
    <h1 className="text-4xl font-bold neon-pink">intimabid</h1>

    <div className="flex items-center gap-8 text-sm">
    <button onClick={() => setActiveTab('feed')} className={`hover:text-pink-400 transition ${activeTab === 'feed' ? 'text-pink-500 font-medium' : ''}`}>Feed</button>
    <button onClick={() => setActiveTab('sell')} className={`hover:text-pink-400 transition ${activeTab === 'sell' ? 'text-pink-500 font-medium' : ''}`}>Vendre</button>
    <button onClick={() => setActiveTab('profile')} className={`hover:text-pink-400 transition ${activeTab === 'profile' ? 'text-pink-500 font-medium' : ''}`}>Moi</button>
    </div>
    </div>
    </header>

    <main className="pt-24 pb-20 max-w-2xl mx-auto px-4">
    {/* Solde VIBE */}
    <div className="bg-zinc-900 rounded-3xl p-5 flex items-center justify-between mb-8">
    <div className="flex items-center gap-3">
    <div className="text-3xl">💎</div>
    <div>
    <p className="text-sm text-zinc-400">Ton solde VIBE</p>
    <p className="text-3xl font-bold text-pink-400">{vibeBalance} VIBE</p>
    </div>
    </div>
    <button className="bg-pink-600 px-6 py-3 rounded-2xl text-sm font-medium">Recharger</button>
    </div>

    {activeTab === 'feed' && (
      <div>
      <h2 className="text-2xl font-semibold mb-6">Enchères en cours 🔥</h2>
      <div className="space-y-6">
      {items.map(item => (
        <div key={item.id} className="bg-zinc-900 rounded-3xl overflow-hidden">
        <div className="h-64 bg-zinc-800 relative">
        <div className="absolute top-4 right-4 bg-black/80 px-4 py-1 rounded-full flex items-center gap-1 text-sm">
        <Clock size={16} /> {item.timeLeft}
        </div>
        </div>
        <div className="p-5">
        <h3 className="font-medium">{item.title}</h3>
        <div className="flex justify-between items-end mt-4">
        <div>
        <p className="text-pink-400 text-4xl font-bold">{item.price}€</p>
        <p className="text-xs text-zinc-500">{item.bids} enchères</p>
        </div>
        <button className="bg-pink-600 hover:bg-pink-700 px-8 py-4 rounded-2xl font-semibold">
        Enchérir
        </button>
        </div>
        </div>
        </div>
      ))}
      </div>
      </div>
    )}

    {activeTab === 'sell' && (
      <div className="text-center py-20">
      <div className="text-6xl mb-6">👙</div>
      <h2 className="text-3xl font-bold mb-4">Mettre en vente</h2>
      <p className="text-zinc-400 mb-8">Partage tes articles intimes avec la communauté</p>
      <button className="bg-pink-600 px-12 py-6 rounded-3xl text-xl font-semibold">
      Créer une annonce
      </button>
      </div>
    )}

    {activeTab === 'profile' && (
      <div>
      <h2 className="text-2xl font-semibold mb-6">Mon Profil</h2>
      <p className="text-zinc-500">Statistiques, ventes et achats bientôt disponibles.</p>
      </div>
    )}
    </main>
    </div>
  );
}
